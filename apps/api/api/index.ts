// Vercel Serverless Function Entry Point
// Firebase를 먼저 초기화한 후 Express 앱 export
import '../src/config/firebase';
import app from '../src/app';

export default app;
