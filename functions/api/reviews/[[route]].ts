import { handleReviewRequest, type ReviewEnv } from '../../../server/reviews'
export const onRequest: PagesFunction<ReviewEnv> = context => handleReviewRequest(context.request, context.env)
