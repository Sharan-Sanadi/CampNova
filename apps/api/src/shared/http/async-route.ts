import type { FastifyReply, FastifyRequest } from "fastify";

export type RouteHandler<TRequest extends FastifyRequest = FastifyRequest> = (
  request: TRequest,
  reply: FastifyReply,
) => Promise<unknown> | unknown;

export const route = <TRequest extends FastifyRequest = FastifyRequest>(handler: RouteHandler<TRequest>) =>
  async (request: TRequest, reply: FastifyReply) => handler(request, reply);
