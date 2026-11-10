import os
from sqlalchemy import create_engine, URL

# The password is read only by the backend; never sent to the browser.
engine = create_engine(URL.create(
    'postgresql+psycopg',
    username=os.getenv('POSTGRES_USER', 'laf'),
    password=os.environ['POSTGRES_PASSWORD'],
    host=os.getenv('POSTGRES_HOST', 'db'),
    port=int(os.getenv('POSTGRES_PORT', '5432')),
    database=os.getenv('POSTGRES_DB', 'laf_maintenance'),
), pool_pre_ping=True, connect_args={
    'connect_timeout': 5,
    'options': '-c default_transaction_read_only=on -c statement_timeout=10000',
})
