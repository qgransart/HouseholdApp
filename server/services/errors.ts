/** Business error with a player-facing message, mapped to an HTTP status by the routes. */
export class ServiceError extends Error {
  constructor(
    readonly statusCode: 400 | 403 | 404 | 409 | 410,
    message: string,
  ) {
    super(message)
  }
}
