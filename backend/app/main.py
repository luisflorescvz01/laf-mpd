import logging
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError
from app.api.routes import router
from app.api.flights import router as flights_router

app = FastAPI(title='LAF Maintenance · API', version='0.2.0')
app.include_router(router)
app.include_router(flights_router)


@app.exception_handler(SQLAlchemyError)
async def database_error(request: Request, exc: SQLAlchemyError):
    # Do not expose SQL, connection settings or credentials to the client/log.
    logging.getLogger('laf').error('Database request failed: %s', type(exc).__name__)
    return JSONResponse(status_code=503, content={
        'detail': 'No se pudo completar la operación en PostgreSQL. Comprueba el servicio y vuelve a intentar.'
    })
