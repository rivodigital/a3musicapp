import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: process.env.PORT || 8080,
  ui24rIp: process.env.UI24R_IP || '192.168.1.10',
  ui24rPort: process.env.UI24R_PORT || 80,
  jwtSecret: process.env.JWT_SECRET || 'super_secret',
  useMock: process.env.MOCK_UI24R === 'true',
};
