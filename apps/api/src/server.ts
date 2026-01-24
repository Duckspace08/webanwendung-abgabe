import { buildApp } from './app.js';

const start = async () => {
  const app = buildApp();
  const port = Number(process.env.PORT || 3001);

  try {
    await app.listen({ port, host: '0.0.0.0' });
    app.log.info(`API running on port ${port}`);
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

start();
