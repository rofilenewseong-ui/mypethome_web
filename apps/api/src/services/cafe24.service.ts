import axios from 'axios';
import { env } from '../config/env';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import type { Cafe24Profile } from '../types';

// ── Cafe24 API 응답 타입 ──────────────────────────

interface Cafe24TokenResponse {
  access_token: string;
  expires_at: string;
  refresh_token: string;
  refresh_token_expires_at: string;
  client_id: string;
  mall_id: string;
  user_id: string;
  scopes: string[];
  issued_at: string;
}

interface Cafe24OrderItem {
  product_no: number;
  product_name: string;
  quantity: number;
  product_price: string;
  order_id: string;
  order_date: string;
}

// ── Cafe24 서비스 ──────────────────────────────────

class Cafe24Service {
  private readonly mallId: string;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;
  private readonly baseUrl: string;

  constructor() {
    this.mallId = env.CAFE24_MALL_ID;
    this.clientId = env.CAFE24_CLIENT_ID;
    this.clientSecret = env.CAFE24_CLIENT_SECRET;
    this.redirectUri = env.CAFE24_REDIRECT_URI;
    this.baseUrl = `https://${this.mallId}.cafe24api.com/api/v2`;
  }

  /** 카페24 OAuth 설정 여부 확인 */
  isConfigured(): boolean {
    return !!(this.mallId && this.clientId && this.clientSecret && this.redirectUri);
  }

  /** OAuth 인증 URL 생성 */
  getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: 'mall.read_personal,mall.read_order',
      state,
    });
    return `https://${this.mallId}.cafe24api.com/api/v2/oauth/authorize?${params.toString()}`;
  }

  /** 인증 코드 → 액세스 토큰 교환 */
  async exchangeCode(code: string): Promise<Cafe24TokenResponse> {
    try {
      const credentials = Buffer.from(
        `${this.clientId}:${this.clientSecret}`
      ).toString('base64');

      const { data } = await axios.post<Cafe24TokenResponse>(
        `${this.baseUrl}/oauth/token`,
        new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: this.redirectUri,
        }).toString(),
        {
          headers: {
            Authorization: `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      return data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: unknown }; message?: string };
      logger.error('Cafe24 token exchange failed:', err.response?.data || err.message);
      throw new AppError('Cafe24 인증에 실패했습니다.', 401);
    }
  }

  /** 고객 정보 조회 */
  async getCustomerInfo(
    accessToken: string,
    memberId: string
  ): Promise<{ member_id: string; name: string; email: string; phone?: string }> {
    try {
      const { data } = await axios.get(
        `${this.baseUrl}/admin/customers/${memberId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'X-Cafe24-Api-Version': '2024-06-01',
          },
        }
      );

      const c = data.customer;
      return {
        member_id: c.member_id,
        name: c.name || c.nick_name || '',
        email: c.email || '',
        phone: c.phone || '',
      };
    } catch (error: unknown) {
      const err = error as { response?: { data?: unknown }; message?: string };
      logger.error('Cafe24 customer info failed:', err.response?.data || err.message);
      throw new AppError('Cafe24 고객 정보 조회에 실패했습니다.', 500);
    }
  }

  /** 주문 내역 조회 */
  async getOrderHistory(accessToken: string, memberId: string): Promise<Cafe24OrderItem[]> {
    try {
      const { data } = await axios.get(`${this.baseUrl}/admin/orders`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Cafe24-Api-Version': '2024-06-01',
        },
        params: {
          member_id: memberId,
          limit: 100,
          order_status: 'N10,N20,N21,N22,N30,N40',
        },
      });

      const items: Cafe24OrderItem[] = [];
      for (const order of data.orders || []) {
        for (const item of order.items || []) {
          items.push({
            product_no: item.product_no,
            product_name: item.product_name,
            quantity: item.quantity,
            product_price: item.product_price,
            order_id: order.order_id,
            order_date: order.order_date,
          });
        }
      }

      return items;
    } catch (error: unknown) {
      const err = error as { response?: { data?: unknown }; message?: string };
      logger.error('Cafe24 order history failed:', err.response?.data || err.message);
      // 치명적 에러가 아님 → BRONZE로 기본 처리
      return [];
    }
  }

  /** 아크릴 세트 구매 여부 판별 (상품ID 우선, 이름 fallback) */
  hasAcrylicSetPurchase(orderItems: Cafe24OrderItem[]): boolean {
    const productIds = env.ACRYLIC_SET_PRODUCT_IDS;

    return orderItems.some((item) => {
      // 1) 상품 ID 기반 판별 (우선)
      if (productIds.length > 0 && productIds.includes(String(item.product_no))) {
        return true;
      }

      // 2) 이름 기반 fallback
      const name = item.product_name.toLowerCase();
      return (
        (name.includes('아크릴') && (name.includes('세트') || name.includes('full'))) ||
        name.includes('풀 세트') ||
        name.includes('full set')
      );
    });
  }

  /** 메인 인증 플로우: 코드 교환 → 고객 정보 → 주문 조회 → 티어 판별 */
  async authenticateCustomer(code: string): Promise<Cafe24Profile> {
    if (!this.isConfigured()) {
      throw new AppError('Cafe24 OAuth가 설정되지 않았습니다.', 503);
    }

    const tokenData = await this.exchangeCode(code);

    const customer = await this.getCustomerInfo(
      tokenData.access_token,
      tokenData.user_id
    );

    const orders = await this.getOrderHistory(
      tokenData.access_token,
      tokenData.user_id
    );

    const hasAcrylicSet = this.hasAcrylicSetPurchase(orders);

    return {
      cafe24MemberId: customer.member_id,
      email: customer.email,
      name: customer.name,
      phone: customer.phone,
      hasAcrylicSet,
    };
  }
}

export const cafe24Service = new Cafe24Service();
