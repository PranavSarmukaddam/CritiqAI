# Architectural Patterns

This document describes the key architectural patterns and design decisions in CritiqAI.

## Pipeline Pattern

The audit system uses a 5-stage sequential pipeline where each stage feeds into the next.

**Orchestration** (`audit_engine.py:76-104`):
```python
# Stages execute in sequence, passing context forward
stage1_result = await stage1_data.run(context, ...)
stage2_result = await stage2_performance.run(context, ...)
# ... stages 3-5
```

**Entry Points** (`audit_engine.py:14-17`):
- Demo mode: Uses synthetic data with fixed random seed
- Upload mode: Uses user-provided CSV and joblib model

## Modular Stage Design

Each pipeline stage is self-contained with a consistent interface.

**Signature Pattern**:
```python
async def run(ctx: AuditContext, data: pd.DataFrame, ...)
    -> Dict[str, Any]
```

Examples:
- `stages/stage1_data.py:8` - Data integrity analysis
- `stages/stage2_performance.py:13` - Performance metrics
- `stages/stage3_bias.py:9` - Fairness detection
- `stages/stage4_robustness.py:9` - Robustness testing
- `stages/stage5_risk.py:20` - Risk aggregation

## Risk Scoring Pattern

Tiered penalty system with weighted aggregation.

**Base Calculation** (`stages/stage5_risk.py:5-17`):
```python
def _risk_score(raw_score: float) -> float:
    # Non-linear scaling: higher scores penalized more aggressively
    return min(100.0, raw_score * penalty_multiplier)
```

Risk is inverted from quality metrics (100 - quality_score) then normalized.

## Floor Rules Pattern

Critical issues override weighted aggregation.

**Implementation** (`stages/stage5_risk.py:33-56`):
```python
floor_rules = [
    (data_leakage_detected, 80),    # Hard floor at 80
    (severe_class_imbalance, 70),   # Hard floor at 70
    # ...
]
for triggered, floor_score in floor_rules:
    final_score = max(final_score, floor_score if triggered else 0)
```

Prevents high scores when critical safety issues exist.

## Caching Pattern

Memoization for demo data generation.

**Implementation** (`demo_data/generate_demo.py:18-26`):
```python
@functools.lru_cache(maxsize=1)
def generate_synthetic_dataset(seed: int = 42) -> pd.DataFrame:
    # Expensive generation cached across calls
    ...
```

Ensures reproducibility and performance for demo mode.

## API Design Patterns

**FastAPI with CORS** (`main.py:28-30`):
```python
app.add_middleware(
    CORSMiddleware, allow_origins=["http://localhost:5173"]
)
```

**Upload Validation** (`main.py:47-65`):
```python
async def upload_audit(
    dataset: UploadFile = File(...),
    model: UploadFile = File(...)
):
    # Validate extensions, save to temp, process
```

## State Management

**React Hooks Only** - No external state library.

**Router State Passing** (`frontend/src/App.jsx`, `frontend/src/pages/Upload.jsx`):
```javascript
// Navigate with state
navigate('/report', { state: { auditId, results } });

// Access in destination
const { state } = useLocation();
```

## Error Handling Pattern

Graceful degradation with flags rather than exceptions.

**Example** (`stages/stage2_performance.py:19-23`):
```python
if insufficient_samples:
    return {
        "passed": False,
        "metrics": {},
        "warnings": ["Insufficient data for reliable metrics"]
    }
```

Pipeline continues even when individual stages encounter issues.

## Configuration Conventions

- Random seed: 42 (reproducibility)
- Risk cap: 100 (maximum score)
- Temp directories: Auto-cleaned after upload processing
- Proxy: Frontend Vite config routes `/api` to backend
