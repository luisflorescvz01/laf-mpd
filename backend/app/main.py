import logging
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError
from app.api.routes import router

app = FastAPI(title='LAF Maintenance · API de consulta', version='0.1.0')
app.include_router(router)


@app.exception_handler(SQLAlchemyError)
async def database_error(request: Request, exc: SQLAlchemyError):
    # Do not expose SQL, connection settings or credentials to the client/log.
    logging.getLogger('laf').error('Database request failed: %s', type(exc).__name__)
    return JSONResponse(status_code=503, content={
        'detail': 'No se pudo consultar PostgreSQL. Comprueba el servicio y vuelve a intentar.'
    })
