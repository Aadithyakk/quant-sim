from app.sandbox import ast_guard


def test_blocks_os_import():
    res = ast_guard.check("import os\nos.system('calc')")
    assert not res.ok


def test_blocks_subprocess():
    res = ast_guard.check("import subprocess")
    assert not res.ok


def test_blocks_exec():
    res = ast_guard.check("exec('x=1')")
    assert not res.ok


def test_blocks_eval():
    res = ast_guard.check("y = eval('1+1')")
    assert not res.ok


def test_blocks_dunder():
    res = ast_guard.check("().__class__.__bases__")
    assert not res.ok


def test_blocks_getattr():
    res = ast_guard.check("getattr({}, 'pop')")
    assert not res.ok


def test_blocks_open():
    res = ast_guard.check("open('x.txt')")
    assert not res.ok


def test_blocks_import_star_disallowed_module():
    res = ast_guard.check("from socket import socket")
    assert not res.ok


def test_allows_pandas_numpy():
    code = "import pandas as pd\nimport numpy as np\ndef generate_signals(prices, params):\n    return prices['close'] * 0"
    res = ast_guard.check(code)
    assert res.ok


def test_allows_math():
    res = ast_guard.check("import math\nx = math.sqrt(4)")
    assert res.ok
