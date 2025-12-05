import { useState } from 'react';
import { generateEmiSchedule } from '../utils/emi';

const EmiCalculator = () => {
  const [amount, setAmount] = useState('');
  const [annualRatePct, setAnnualRatePct] = useState('12');
  const [months, setMonths] = useState('12');
  const [plan, setPlan] = useState(null);

  const calculate = () => {
    const p = Number(amount || 0);
    const r = Number(annualRatePct || 0);
    const n = Number(months || 0);
    const startDate = new Date();
    const result = generateEmiSchedule({ amount: p, annualRatePct: r, months: n, startDate });
    setPlan(result);
  };

  return (
    <div className="dash-container">
      <div className="dash-card">
        <h2>EMI Calculator</h2>
        <div className="dash-inline">
          <div>
            <label className="dash-label">Amount</label>
            <input className="dash-input" type="number" value={amount} onChange={(e)=>setAmount(e.target.value)} />
          </div>
          <div>
            <label className="dash-label">Annual Rate (%)</label>
            <input className="dash-input" type="number" value={annualRatePct} onChange={(e)=>setAnnualRatePct(e.target.value)} />
          </div>
          <div>
            <label className="dash-label">Months</label>
            <input className="dash-input" type="number" value={months} onChange={(e)=>setMonths(e.target.value)} />
          </div>
          <button className="dash-button" onClick={calculate}>Calculate</button>
        </div>
      </div>

      {plan && (
        <div className="dash-card">
          <h3 style={{ marginTop:0 }}>Result</h3>
          <div className="dash-inline">
            <div><span className="dash-label">EMI</span><div>₹{plan.emi}</div></div>
            <div><span className="dash-label">Total Interest</span><div>₹{plan.totalInterest}</div></div>
          </div>
          <table className="dash-table" style={{ marginTop:8 }}>
            <thead className="dash-thead">
              <tr>
                <th>#</th><th>Due Date</th><th>EMI</th><th>Principal</th><th>Interest</th><th>Remaining</th>
              </tr>
            </thead>
            <tbody>
              {plan.schedule.slice(0, 12).map(r => (
                <tr className="dash-row" key={r.installment}>
                  <td>{r.installment}</td>
                  <td>{new Date(r.dueDate).toLocaleDateString()}</td>
                  <td>₹{r.emi}</td>
                  <td>₹{r.principal}</td>
                  <td>₹{r.interest}</td>
                  <td>₹{r.remaining}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="dash-empty">Showing first 12 installments</div>
        </div>
      )}
    </div>
  );
};

export default EmiCalculator;