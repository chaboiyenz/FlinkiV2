import { router } from './trpc'
import { userRouter } from './routers/user'
import { stravaRouter } from './routers/strava'

export const appRouter = router({
  user: userRouter,
  strava: stravaRouter,
})

export type AppRouter = typeof appRouter
