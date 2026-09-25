import { ServiceError } from '../services/errors'

/** Turns a business error into an HTTP error whose message the app can show as is. */
export async function withServiceErrors<T>(action: () => Promise<T>): Promise<T> {
  try {
    return await action()
  }
  catch (error) {
    if (error instanceof ServiceError) {
      throw createError({ statusCode: error.statusCode, statusMessage: error.message, data: { message: error.message } })
    }
    throw error
  }
}
