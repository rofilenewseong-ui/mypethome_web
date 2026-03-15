import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.issues.map((e: any) => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        res.status(400).json({ success: false, error: '입력값이 올바르지 않습니다.', details: errors });
        return;
      }
      next(error);
    }
  };
}
