from dataclasses import dataclass, field


@dataclass(frozen=True)
class Config:
    """策略条件和参数容器，对应创建工作区时选择的画像字段。"""

    market: str = "股票"
    pool: str = "全市场"
    tf: str = "1d"
    side: str = "做多"
    hold: str = "波段"
    target: str = ""
    source: list[str] = field(default_factory=list)
    factor: list[str] = field(default_factory=list)
    filter: list[str] = field(default_factory=list)
    entry: list[str] = field(default_factory=list)
    exit: list[str] = field(default_factory=list)
    risk: list[str] = field(default_factory=list)
    stop: list[str] = field(default_factory=list)
    pos: str = ""
    limit: list[str] = field(default_factory=list)
    output: list[str] = field(default_factory=list)
    note: str = ""
    params: dict = field(default_factory=dict)


cfg = Config()
bars = []
