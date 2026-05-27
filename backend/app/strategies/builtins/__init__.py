from .sma_cross import SMACross
from .rsi_mean_rev import RSIMeanRev
from .momentum import Momentum

BUILTINS = {
    "sma_cross": SMACross,
    "rsi_mean_rev": RSIMeanRev,
    "momentum": Momentum,
}
