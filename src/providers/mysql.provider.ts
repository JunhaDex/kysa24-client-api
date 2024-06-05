import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const MYSQL_CONFIG: TypeOrmModuleOptions = {
  type: 'mysql',
  host: process.env.MYSQL_HOST,
  port: Number(process.env.DB_MYSQL_PORT),
  username: process.env.DB_MYSQL_USERNAME,
  password: process.env.DB_MYSQL_PASSWORD,
  database: process.env.DB_MYSQL_DATABASE,
} as const;
