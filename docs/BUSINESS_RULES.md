# Business Rules and Mathematical Definitions

## Agency SLA and Margin Leakage Tracker

---

### 1. Revenue Recognition Models

Revenue is calculated deterministically per client for each reporting period:

1. **RETAINER**:
   - Contractual monthly retainer amount prorated by reporting period duration:
     $$\text{Retainer Revenue} = \left(\frac{\text{Contractual Monthly Retainer}}{30}\right) \times \text{Reporting Days}$$
2. **HOURLY**:
   - Approved billable hours logged by recruiters multiplied by client contractual billable hourly rate:
     $$\text{Hourly Revenue} = \sum (\text{Approved Billable Hours} \times \text{Hourly Billing Rate})$$
3. **PER_HIRE**:
   - Confirmed billable candidate placements in period multiplied by contractual per-hire fee:
     $$\text{Per-Hire Revenue} = \text{Confirmed Hires Count} \times \text{Placement Fee}$$
4. **Financial Adjustments**:
   - Approved credits, bonuses, or contractual SLA penalty deductions:
     $$\text{Total Client Revenue} = \text{Retainer Rev} + \text{Hourly Rev} + \text{Per-Hire Rev} + \text{Adjustments}$$

---

### 2. Direct Recruiter Labor Cost Allocation

1. **Hourly Recruiter Cost**:
   $$\text{Hourly Labor Cost} = \text{Approved Hours} \times \text{Hourly Cost Rate} \times (1 + \text{Overhead Multiplier})$$
2. **Salaried Recruiter Cost**:
   - Monthly salary is converted into an effective hourly labor rate using standard weekly working hours:
     $$\text{Standard Monthly Hours} = \text{Standard Weekly Hours} \times 4.333333$$
     $$\text{Effective Hourly Rate} = \frac{\text{Monthly Salary}}{\text{Standard Monthly Hours}}$$
     $$\text{Salaried Labor Cost} = \text{Approved Hours} \times \text{Effective Hourly Rate} \times (1 + \text{Overhead Multiplier})$$
3. **Total Direct Cost**:
   $$\text{Direct Cost} = \sum \text{Recruiter Direct Labor Costs} + \text{Approved Other Direct Costs}$$

---

### 3. Profit and Margin Formulas

- **Gross Profit**:
  $$\text{Profit} = \text{Total Recognized Revenue} - \text{Total Direct Cost}$$
- **Profit Margin Percentage**:
  $$\text{Profit Margin (\%)} = \left(\frac{\text{Profit}}{\text{Total Recognized Revenue}}\right) \times 100$$
- **Edge Cases**:
  - If **Revenue $= 0$** and **Direct Cost $> 0$**: Profit Margin is returned as `null` and flagged as `NO_REVENUE_DEFICIT`.
  - If **Revenue $= 0$** and **Direct Cost $= 0$**: Profit Margin is returned as `null` and flagged as `NO_ACTIVITY`.
  - Division by zero is completely prevented across all components and reports.

---

### 4. Contractual SLA Clock & Risk Rules

- **Total Duration**: Elapsed business hours between SLA Start Date and Contractual Deadline Date.
- **Elapsed Duration**: Elapsed business hours from SLA Start Date to Current Time (or Shortlist Submission Date if reached).
- **SLA Consumption Percentage**:
  $$\text{SLA Consumption (\%)} = \left(\frac{\text{Elapsed Duration}}{\text{Total Duration}}\right) \times 100$$
- **Working-Day Policy**:
  - Excludes Saturdays and Sundays.
  - Excludes configured client holiday calendar dates.
  - Bounded by daily business hours (default 9:00 AM to 5:00 PM).

#### The 4 Core Risk Rules:

- **RULE 1 — AMBER SLA WARNING**:
  - Triggered when SLA Consumption $\ge 70.0\%$ and required shortlist milestone is **NOT** completed.
- **RULE 2 — RED SLA WARNING & BREACH**:
  - Triggered when SLA Consumption $\ge 90.0\%$ (Warning), or current time $>$ deadline without completion (`BREACHED`).
- **RULE 3 — LOW MARGIN WARNING**:
  - Triggered when Client Calculated Profit Margin % falls below the configured threshold (default $< 20.0\%$).
- **RULE 4 — RECRUITER OVERLOAD**:
  - Triggered when a recruiter has active open roles $>$ `maxOpenRolesThreshold` (default $> 8$) **OR** weekly recorded hours $>$ `maxWeeklyHoursThreshold` (default $> 45.0$h). Both thresholds are independently configurable.

---

### 5. Recruiter Capacity & Utilization

- **Capacity**: Weekly standard contracted hours (default 40.0h).
- **Utilization Percentage**:
  $$\text{Utilization (\%)} = \left(\frac{\text{Total Recorded Hours This Week}}{\text{Weekly Capacity Hours}}\right) \times 100$$
- If Capacity $= 0$, Utilization is safely treated as $0.0\%$.

