const Log = require('@dazn/lambda-powertools-logger')



module.exports = (thresholdMillis = 10,customLogger=undefined) => {
  const createTimer = (event, context, thresholdMillis) => {
  if (typeof context.getRemainingTimeInMillis !== 'function') {
    return null
  }

  const timeLeft = context.getRemainingTimeInMillis()
  const timeoutMs = timeLeft - thresholdMillis
  const timer = setTimeout(() => {
    const awsRequestId = context.awsRequestId
    const invocationEvent = JSON.stringify(event)
    if(typeof customLogger !== 'undefined'){
      customLogger('invocation timed out', { awsRequestId, invocationEvent,context })
    }
    else{
    Log.error('invocation timed out', { awsRequestId, invocationEvent })      
    }
  }, timeoutMs)

  return timer
}

const hasTimer = (context) => {
  return context.lambdaPowertoolsLogTimeoutMiddleware &&
    context.lambdaPowertoolsLogTimeoutMiddleware.timer
}


  return {
    before: (handler, next) => {
      const timer = createTimer(handler.event, handler.context, thresholdMillis)
      Object.defineProperty(handler.context, 'lambdaPowertoolsLogTimeoutMiddleware', {
        enumerable: false,
        value: { timer }
      })

      next()
    },
    after: (handler, next) => {
      if (hasTimer(handler.context)) {
        clearTimeout(handler.context.lambdaPowertoolsLogTimeoutMiddleware.timer)
      }

      next()
    },
    onError: (handler, next) => {
      if (hasTimer(handler.context)) {
        clearTimeout(handler.context.lambdaPowertoolsLogTimeoutMiddleware.timer)
      }

      next(handler.error)
    }
  }
}
