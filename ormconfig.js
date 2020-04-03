module.exports = {
  type:     'mysql',
  host:     process.env.DATABASE_HOST,
  port:     process.env.DATABASE_PORT || 3306,
  username: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  synchronize: true,
  logger: 'advanced-console',
  logging: 'all',
  cache: true,
  dropSchema: false,
  entities: ['dist/entities/*.js','dist/modules/*/entities/*.js'],
};
