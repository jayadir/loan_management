export function toMonthlyCount(termWeeks) {
  return Math.max(1, Math.round(termWeeks / 4.345));
}

export function generateEmiSchedule({ amount, annualRatePct, months, startDate }) {
  const r = annualRatePct / 12 / 100;
  const n = months;
  const emi = r === 0 ? amount / n : (amount * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  const schedule = [];
  let remaining = amount;
  let current = new Date(startDate);
  for (let i = 1; i <= n; i++) {
    const interest = remaining * r;
    const principal = emi - interest;
    remaining = Math.max(0, remaining - principal);
    const due = new Date(current);
    due.setMonth(due.getMonth() + 1);
    current = due;
    schedule.push({
      installment: i,
      dueDate: due.toISOString(),
      emi: Number(emi.toFixed(2)),
      principal: Number(principal.toFixed(2)),
      interest: Number(interest.toFixed(2)),
      remaining: Number(remaining.toFixed(2)),
      status: 'upcoming',
    });
  }
  return { emi: Number(emi.toFixed(2)), totalInterest: Number((emi * n - amount).toFixed(2)), schedule };
}