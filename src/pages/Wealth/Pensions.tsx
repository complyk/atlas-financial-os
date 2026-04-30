import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/schema';
import { Card, CardHeader, CardTitle, Skeleton } from '../../components/ui';
import { PageLayout } from '../../components/layout/PageLayout';
import { formatCurrency } from '../../lib/format';

function projectPension(currentValue: number, monthlyContrib: number, annualReturn: number, years: number): number {
  const monthly = annualReturn / 12;
  let val = currentValue;
  for (let i = 0; i < years * 12; i++) {
    val = val * (1 + monthly) + monthlyContrib;
  }
  return val;
}

export default function Pensions() {
  const data = useLiveQuery(async () => {
    const [accounts, settings, people] = await Promise.all([
      db.accounts.filter(a => a.isActive && (a.type === 'pension_dc' || a.type === 'pension_db')).toArray(),
      db.settings.get('singleton'),
      db.people.toArray(),
    ]);
    const peopleMap = Object.fromEntries(people.map(p => [p.id, p]));
    return { accounts, settings, peopleMap };
  }, []);

  if (!data) return <PageLayout><Skeleton className="h-64" /></PageLayout>;
  const { accounts, settings, peopleMap } = data;
  const totalPension = accounts.reduce((s, a) => s + a.balance, 0);

  return (
    <PageLayout>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card>
          <p className="text-xs text-text-tertiary mb-1">Total Pension Value</p>
          <p className="font-mono text-2xl font-bold text-text-primary">{formatCurrency(totalPension, 'AED', 'en-AE', true)}</p>
        </Card>
        <Card>
          <p className="text-xs text-text-tertiary mb-1">Target Retirement Age</p>
          <p className="font-mono text-2xl font-bold text-text-primary">{settings?.projection.retirementAgePrimary ?? 60}</p>
        </Card>
      </div>

      {accounts.map(acc => {
        const person = acc.personId ? peopleMap[acc.personId] : null;
        const retAge = (person?.retirementAge) ?? settings?.projection.retirementAgePrimary ?? 60;
        const dob = person?.dateOfBirth;
        const currentAge = dob ? Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 3600 * 1000)) : 35;
        const yearsToRetire = Math.max(0, retAge - currentAge);
        const monthlyContrib = settings ? settings.primaryIncome * settings.projection.pensionContributionRate / 12 : 1500;

        return (
          <Card key={acc.id} className="mb-4">
            <CardHeader>
              <CardTitle>{acc.name}</CardTitle>
              <span className="text-xs text-text-tertiary">{acc.provider}</span>
            </CardHeader>
            <p className="font-mono text-2xl font-bold text-text-primary mb-4">{formatCurrency(acc.balance, 'AED', 'en-AE', true)}</p>
            <div className="grid grid-cols-3 gap-4">
              {[3, 5, 7].map(rate => {
                const projected = projectPension(acc.balance, monthlyContrib, rate / 100, yearsToRetire);
                return (
                  <div key={rate} className="bg-surface-raised rounded-xl p-3 text-center">
                    <p className="text-xs text-text-tertiary mb-1">{rate}% return</p>
                    <p className="font-mono text-sm font-bold text-text-primary">{formatCurrency(projected, 'AED', 'en-AE', true)}</p>
                    <p className="text-xs text-text-tertiary">in {yearsToRetire}y</p>
                  </div>
                );
              })}
            </div>
            {acc.interestRate && <p className="mt-3 text-xs text-text-tertiary">Current rate: {(acc.interestRate * 100).toFixed(2)}% p.a.</p>}
          </Card>
        );
      })}

      {accounts.length === 0 && (
        <Card>
          <p className="text-sm text-text-secondary text-center py-8">No pension accounts found. Add a Pension DC or Pension DB account in Accounts.</p>
        </Card>
      )}
    </PageLayout>
  );
}
