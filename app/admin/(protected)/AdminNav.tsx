'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const NAV_LINKS = [
  { href: '/admin/reservaciones',  label: 'Reservaciones'  },
  { href: '/admin/hospedajes',     label: 'Hospedajes'     },
  { href: '/admin/calendario',     label: 'Calendario'     },
  { href: '/admin/analytics',      label: 'Analytics'      },
  { href: '/admin/configuracion',  label: 'Configuración'  },
  { href: '/admin/nueva',          label: '+ Nueva'        },
];

export default function AdminNav() {
  const pathname = usePathname();
  const router   = useRouter();

  const handleLogout = async () => {
    await fetch('/api/admin/auth', { method: 'DELETE' });
    router.push('/admin/login');
  };

  return (
    <nav style={{
      background: '#fff',
      borderBottom: '1px solid #e8e4de',
      display: 'flex', alignItems: 'stretch',
      overflowX: 'auto',
      /* hide scrollbar but keep scroll */
      scrollbarWidth: 'none',
      WebkitOverflowScrolling: 'touch',
    } as React.CSSProperties}>
      {/* Brand — never shrinks */}
      <span style={{
        fontWeight: 700, fontSize: '0.88rem', color: '#856d47',
        padding: '0 16px', display: 'flex', alignItems: 'center',
        flexShrink: 0, whiteSpace: 'nowrap',
        borderRight: '1px solid #f0ece5',
      }}>
        El Encino
      </span>

      {/* Scrollable links */}
      <div style={{ display: 'flex', alignItems: 'stretch', gap: 0, overflowX: 'auto', scrollbarWidth: 'none' } as React.CSSProperties}>
        {NAV_LINKS.map(({ href, label }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link key={href} href={href} style={{
              padding: '14px 12px',
              fontSize: '0.8rem', fontWeight: active ? 600 : 400,
              color: active ? '#856d47' : '#4a4a4a',
              textDecoration: 'none',
              borderBottom: active ? '2px solid #856d47' : '2px solid transparent',
              whiteSpace: 'nowrap', flexShrink: 0,
              display: 'flex', alignItems: 'center',
            }}>
              {label}
            </Link>
          );
        })}
      </div>

      {/* Logout — pinned right */}
      <button onClick={handleLogout} style={{
        marginLeft: 'auto', flexShrink: 0,
        background: 'none', border: 'none',
        borderLeft: '1px solid #f0ece5',
        padding: '0 14px',
        fontSize: '0.75rem', color: '#aaa',
        cursor: 'pointer',
      }}>
        Salir
      </button>
    </nav>
  );
}
