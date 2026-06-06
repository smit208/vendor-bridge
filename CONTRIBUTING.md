# Contributing to VendorBridge

## Running locally

```bash
# Option 1 — just open the file
open index.html

# Option 2 — serve with npx
npx serve .

# Option 3 — Python http server
python -m http.server 3000
```

Then open `http://localhost:3000`.

## Project structure

```
vendorbridge/
├── index.html          Main application (React SPA, all-in-one)
├── logo.png            App logo
├── vercel.json         Vercel deployment config
├── package.json        Project metadata
├── README.md           Project overview
└── docs/
    ├── ARCHITECTURE.md Component tree and state structure
    └── DATA_MODELS.md  All data schemas with examples
```

## How to add a new page

1. Define a new component `const MyPage = () => { ... }` in `index.html`
2. Add it to the `NAV_CONFIG` object for the appropriate role(s)
3. Add a case in `renderPage()` at the bottom of the file

## State actions

All state changes go through the reducer. To add a new action:

```js
// In the reducer switch statement:
case 'MY_ACTION':
  return { ...state, myData: action.payload };

// To dispatch:
dispatch({ type: 'MY_ACTION', payload: newData });
```

## Roles

Roles are defined in the `ROLES` constant:
- `ROLES.ADMIN`
- `ROLES.OFFICER`
- `ROLES.VENDOR`
- `ROLES.MANAGER`

## Seeding test data

The `SEED_DATA` object at the top of the app defines default users, vendors, RFQs and quotations loaded on first run. Modify it to change the default demo state.
