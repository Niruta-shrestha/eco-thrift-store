import { NextFunction, Request, Response } from "express";
import { Controller } from "../controller";
import { GetAllProductsService } from "../../../../../contexts/ecom/products/application/get-all-products.services";
import httpStatus from "http-status";

export class GetAllProductsController implements Controller {
    constructor(private readonly getAllProductsService: GetAllProductsService){}

    public async invoke(req:Request, res:Response, next:NextFunction): Promise<void> {
        
      console.log("query params", req.query);
      const categoriesFilter = req.query.categories ? (req.query.categories as string).split(",") : []
        try {
          const rawPage = Number(req.query.page);
const rawLimit = Number(req.query.limit ?? req.query.pageSize);

const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? rawLimit : 10;

const products = await this.getAllProductsService.invoke({
    limit,
    page,
    search: typeof req.query.search === "string" ? req.query.search : "",
    categories: categoriesFilter
});
            res.status(httpStatus.OK).send(products);
        } catch (error) {
            next(error)
        }
    }
}