import { availability } from '../server/availability'

// All public routes pass this gate; no API handler runs after retirement.
export const onRequest: PagesFunction = context => availability(context.request, () => context.next())
