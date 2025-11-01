import { Router } from 'express';

const router = Router();

router.post('/osrm', async (_request, response) => {
  response.status(501).json({
    message: 'Route calculation not implemented yet. Configure OSRM/OpenRouteService endpoint first.'
  });
});

export default router;
