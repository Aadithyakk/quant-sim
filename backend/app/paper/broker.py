from __future__ import annotations
from dataclasses import dataclass


@dataclass
class FillResult:
    side: str  # "buy" | "sell"
    quantity: float
    price: float
    fee: float


def simulate_fill(
    cash: float,
    position: float,
    last_price: float,
    target_weight: float,
    commission_bps: float = 1.0,
    slippage_bps: float = 2.0,
) -> tuple[float, float, FillResult | None]:
    """Move toward target_weight at last_price + slippage. Returns (new_cash, new_position, fill).

    Weights are fractions of (cash + position * last_price) equity. -1..+1.
    """
    if last_price <= 0:
        return cash, position, None
    equity = cash + position * last_price
    target_value = target_weight * equity
    target_qty = target_value / last_price
    delta_qty = target_qty - position
    if abs(delta_qty * last_price) < 1.0:
        return cash, position, None  # below $1 trade
    side = "buy" if delta_qty > 0 else "sell"
    slip = (slippage_bps / 10_000.0) * (1 if side == "buy" else -1)
    fill_price = last_price * (1 + slip)
    notional = abs(delta_qty) * fill_price
    fee = notional * (commission_bps / 10_000.0)
    new_cash = cash - delta_qty * fill_price - fee
    new_position = position + delta_qty
    return new_cash, new_position, FillResult(side=side, quantity=abs(delta_qty), price=fill_price, fee=fee)
