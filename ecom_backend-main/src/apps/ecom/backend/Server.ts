import express from 'express';
import * as http from 'http';
import { AddressInfo } from 'net';
import { ServerLogger } from '../../../contexts/shared/infrastructure/winstonLogger';

export class Server {
  private readonly express: express.Application;
  private http!: http.Server;

  constructor(
    private readonly router: express.Router,
    private readonly logger: ServerLogger,
  ) {
    this.express = express();
    this.express.use(this.logger.stream());
    this.express.use(this.router);
  }

  public start = async (): Promise<void> => {
    return await new Promise<void>((resolve, reject) => {
      this.http = this.express.listen(Number(process.env.PORT), () => {
        const address = this.http.address();

        if (!address || typeof address === "string") {
          this.logger.info(`🚀 Application running`);
          resolve();
          return;
        }

        this.logger.info(`🚀 Application running at http://localhost:${address.port}`);
        resolve();
      });

      this.http.on("error", (error) => {
        reject(error);
      });
    });
  };

  get httpServer() {
    return this.http;
  }

  public stop = async (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (this.http) {
        this.http.close((error: any) => {
          if (error) {
            return reject(new Error(error));
          }
          return resolve();
        });
      }

      return resolve();
    });
  };

  public invoke = (): express.Application => this.express;
}