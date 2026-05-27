from __future__ import annotations
import ast
from dataclasses import dataclass


ALLOWED_IMPORTS = {"pandas", "numpy", "math", "statistics", "pd", "np"}

DENIED_NAMES = {
    "exec", "eval", "compile", "open", "__import__", "input",
    "globals", "locals", "vars", "getattr", "setattr", "delattr",
    "breakpoint", "help", "exit", "quit", "memoryview",
}

DENIED_ATTR_PREFIX = ("__",)


class SandboxViolation(Exception):
    pass


@dataclass
class GuardResult:
    ok: bool
    reason: str | None = None


class _Guard(ast.NodeVisitor):
    def __init__(self):
        self.violations: list[str] = []

    def visit_Import(self, node: ast.Import):
        for alias in node.names:
            root = alias.name.split(".")[0]
            if root not in ALLOWED_IMPORTS:
                self.violations.append(f"disallowed import: {alias.name}")
        self.generic_visit(node)

    def visit_ImportFrom(self, node: ast.ImportFrom):
        mod = (node.module or "").split(".")[0]
        if mod not in ALLOWED_IMPORTS:
            self.violations.append(f"disallowed import from: {node.module}")
        self.generic_visit(node)

    def visit_Attribute(self, node: ast.Attribute):
        if isinstance(node.attr, str) and node.attr.startswith(DENIED_ATTR_PREFIX):
            self.violations.append(f"dunder attribute access: {node.attr}")
        self.generic_visit(node)

    def visit_Name(self, node: ast.Name):
        if node.id in DENIED_NAMES:
            self.violations.append(f"disallowed name: {node.id}")
        self.generic_visit(node)

    def visit_Call(self, node: ast.Call):
        if isinstance(node.func, ast.Name) and node.func.id in DENIED_NAMES:
            self.violations.append(f"disallowed call: {node.func.id}")
        self.generic_visit(node)


def check(code: str) -> GuardResult:
    try:
        tree = ast.parse(code)
    except SyntaxError as e:
        return GuardResult(False, f"SyntaxError: {e}")
    g = _Guard()
    g.visit(tree)
    if g.violations:
        return GuardResult(False, "; ".join(g.violations))
    return GuardResult(True)


def assert_safe(code: str) -> None:
    res = check(code)
    if not res.ok:
        raise SandboxViolation(res.reason or "unsafe code")
