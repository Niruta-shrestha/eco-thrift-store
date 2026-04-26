import { NextFunction, Request, Response } from "express";
import { Controller } from "../controller";
import { body } from "express-validator";
import { MESSAGE_CODES } from "../../../../../contexts/shared/infrastructure/utils/message-code";
import { RequestValidator } from "../../../../../contexts/shared/infrastructure/middleware/request-validator";
import { GetUserByEmailService } from "../../../../../contexts/ecom/users/application/get-user-by-email.services";
import httpStatus from "http-status";
import { Payload, TokenScope } from "../../../../../contexts/shared/domain/interface/payload";
import { JWTSign } from "../../../../../contexts/shared/infrastructure/authorizer/jwt-sign";
import { comparePassword } from "../../../../../contexts/shared/infrastructure/encryptor/password";

export class UserLoginController implements Controller {
  constructor(
    private readonly getUserByEmailService: GetUserByEmailService
  ) {}

  public validate = [
    body("email")
      .exists()
      .withMessage(MESSAGE_CODES.USER.INVALID_EMAIL)
      .isEmail()
      .withMessage(MESSAGE_CODES.USER.INVALID_EMAIL),

    body("password")
      .exists()
      .withMessage(MESSAGE_CODES.USER.REQUIRED_PASSWORD),

    RequestValidator,
  ];

  public async invoke(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { email, password } = req.body;

      const isUser = await this.getUserByEmailService.invoke(email.toLowerCase());

      if (!isUser) {
        res
          .status(httpStatus.UNAUTHORIZED)
          .send(MESSAGE_CODES.USER.INVALID_CREDENTIALS);
        return;
      }

      // ✅ Correct bcrypt password check
      const isPasswordValid = await comparePassword(
        password,
        isUser.password as string
      );

      if (!isPasswordValid) {
        res
          .status(httpStatus.UNAUTHORIZED)
          .send(MESSAGE_CODES.USER.INVALID_CREDENTIALS);
        return;
      }

      const payload: Payload = {
        user_id: isUser.id!,
        role: isUser.role!,
        scope: [
          isUser.role === "ADMIN"
            ? TokenScope.ADMIN_ACCESS
            : TokenScope.USER_ACCESS,
        ],
      };

      const jwtSecret = process.env.JWT_SECRET_KEY;

      if (!jwtSecret) {
        throw new Error("JWT_SECRET_KEY is missing in .env");
      }

      const jwtToken = JWTSign(
        payload,
        jwtSecret,
        { expiresIn: 3600 },
        { expiresIn: 10800 }
      );

      res.cookie("thrift", jwtToken.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        maxAge: 60 * 60 * 1000,
      });

      res.status(httpStatus.OK).send({
        token: jwtToken,
        user: {
          id: isUser.id,
          firstName: isUser.firstName,
          lastName: isUser.lastName,
          email: isUser.email,
          address: isUser.address,
          role: isUser.role,
          image: isUser.image,
          phone: isUser.phone,
        },
      });
    } catch (error) {
      console.error("Login error:", error);
      next(error);
    }
  }
}