import { Link } from 'react-router';
import { modules } from './modules';

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
