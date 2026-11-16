import { Link } from 'react-router';

const modules = [
  {
    path: '/ledger',
    name: 'Phantom Ledger',
    description: 'Collect money friends owe and send badminton invites.',
  },
];

export function Home() {
  return (
    <div className="shell-page">
      <h1>Modules</h1>
      <ul className="shell-modules">
        {modules.map((module) => (
          <li key={module.path}>
            <Link to={module.path}>{module.name}</Link>
            <p>{module.description}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
