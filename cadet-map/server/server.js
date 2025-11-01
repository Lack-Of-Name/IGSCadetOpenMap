import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRouter from './routes/auth.js';
import routeRouter from './routes/route.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(',') ?? '*' }));
app.use(express.json());

app.get('/api/health', (_request, response) => {
  response.json({ status: 'ok', uptime: process.uptime() });
});

app.use('/api/auth', authRouter);
app.use('/api/routes', routeRouter);

app.use((error, _request, response, _next) => {
  console.error(error); // eslint-disable-line no-console
  const status = error.status ?? 500;
  response.status(status).json({ message: error.message ?? 'Server error' });
});

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Cadet Map server running on port ${port}`);
});
