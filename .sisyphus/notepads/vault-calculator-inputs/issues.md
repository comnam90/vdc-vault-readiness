### Issue 5: Calculator Aggregator Logic Ambiguity

**Problem**: `AvgChangeRate` in JSON seems to be a raw size (e.g. 809 MB) rather than a percentage (e.g. 5%). The aggregator `calculateWeightedChangeRate` treats it as a rate and weights it by `MaxDataSize`.

**Context**:

- JSON Example: `Job_55` has `MaxDataSize: 1275` and `AvgChangeRate: 809`.
- If `AvgChangeRate` is a percentage, 809% is unrealistic.
- If `AvgChangeRate` is a size (MB), then `Rate * Size` calculation in aggregator is semantically questionable for a weighted average rate (it calculates weighted average _change size_).

**Resolution (Temporary)**:

- The UI currently displays the result as a percentage (e.g. "809.00%"), which faithfully reflects the aggregator's output but might be misleading if the input data is not a percentage.
- This needs verification with domain experts or data schema documentation to confirm the unit of `AvgChangeRate`.
- For now, the component follows the requirement "Show weighted avg as percentage".
