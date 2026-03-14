/**
 * HTML 태그 제거 + 앞뒤 공백 제거.
 * XSS 방지를 위해 사용자 입력 텍스트에 적용.
 */
export function sanitizeText(input: string): string {
  return input.replace(/<[^>]*>/g, '').trim();
}
