import  { Router as ExpressRouter } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import bodyParser from 'body-parser';
import compression from 'compression';
import swaggerUi from 'swagger-ui-express';
import swaggerDocument from '../../../../swaggerApi.json';

export const Router = (masterRouter: ExpressRouter, errorMiddleware: any): ExpressRouter => {
  const router = ExpressRouter();
  const allowedOrigins = (process.env.FRONTEND_URL || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  router.use(cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS policy does not allow access from ${origin}`));
    },
    credentials: true
  }));
  router.use(helmet());

  router
    .use(bodyParser.json())
    .use(
      bodyParser.urlencoded({
        extended: false
      })
    )
    .use(compression())

  router.use("/api", masterRouter);

  router.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

  router.use(errorMiddleware.routeNotFoundErrorHandler);
  router.use(errorMiddleware.clientErrorHandler);
  router.use(errorMiddleware.InternalServerError);
  return router;
}