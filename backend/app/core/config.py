import os
from decimal import Decimal

WARNING_RATIO = Decimal(os.getenv('WARNING_RATIO', '0.10'))
if not 0 < WARNING_RATIO < 1:
    raise ValueError('WARNING_RATIO must be between zero and one')
