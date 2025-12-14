interface SidebarProps {
  selected: string;
  onSelect: (tab: string) => void;
  isOwner?: boolean;
  isAdmin?: boolean;
}

// Items visible to everyone
const memberMenuItems = [
  "Overview",
  "Role",      // Members see self-assignable roles view
  "Members",   // Members can view the member list
  "Leave",
];

// Items only visible to admins and owners
const adminMenuItems = [
  "Overview",
  "Role",
  "Members",
  "Invite people",
  "Add Channel",
  "Leave",
];

// Items only visible to owners
const ownerMenuItems = [
  "Overview",
  "Role",
  "Members",
  "Invite people",
  "Add Channel",
  "Leave",
  "Danger Zone",
];

export default function Sidebar({ selected, onSelect, isOwner = false, isAdmin = false }: SidebarProps) {
  // Determine which menu items to show based on role
  let menuItems: string[];
  
  if (isOwner) {
    menuItems = ownerMenuItems;
  } else if (isAdmin) {
    menuItems = adminMenuItems;
  } else {
    menuItems = memberMenuItems;
  }

  return (
    <nav className="w-64 min-h-screen bg-[#18191c] p-6 flex flex-col border-r border-[#23272a]">
      <h2 className="text-2xl font-extrabold mb-8 text-white tracking-wide">Server Settings</h2>
      <ul className="flex flex-col gap-1">
        {menuItems.map((item) => (
          <li
            key={item}
            className={`px-4 py-2 rounded cursor-pointer font-medium transition-all duration-150
              ${
                selected === item
                  ? "bg-[#23272a] text-white"
                  : "text-[#b5bac1] hover:bg-[#23272a] hover:text-white"
              }
            `}
            onClick={() => onSelect(item)}
          >
            {item}
          </li>
        ))}
      </ul>
    </nav>
  );
}
 