"use client";

import DashboardCard from "../../components/DashboardCard";

const featuredCommunities = [
  { title: "Gaming", image: "/gaming.jpg" },
  { title: "CyberPunk", image: "/gaming.jpg" },
];

const popularCommunities = [
  { title: "3D Art", image: "/gaming.jpg", members: "345,678" },
  { title: "NFT", image: "/gaming.jpg", members: "887,789" },
];

const newMembers = [
  { name: "Anne Couture", avatar: "/User_profil.png", time: "1h ago" },
  { name: "Miriam Solell", avatar: "/User_profil.png", time: "3h ago" },
  { name: "Marie Laval", avatar: "/User_profil.png", time: "7h ago" },
  { name: "Mark Morain", avatar: "/User_profil.png", time: "1d ago" },
];

const recentActivities = [
  {
    name: "Hola Spine",
    message: "invited you to a channel",
    avatar: "/User_profil.png",
    time: "2h ago",
  },
  {
    name: "Eva Solain",
    message: "invited you to a chat",
    avatar: "/User_profil.png",
    time: "5h ago",
  },
  {
    name: "Pierre Ford",
    message: "followed you",
    avatar: "/User_profil.png",
    time: "1d ago",
  },
  {
    name: "Steve Alter",
    message: "followed you",
    avatar: "/User_profil.png",
    time: "2d ago",
  },
];

export default function DashboardPage() {
  return (
    <div className="flex h-screen text-white overflow-hidden">
      {/* Main Section */}
      <main className="flex-1 overflow-y-auto p-6 bg-black">
        <div
          className="rounded-3xl mb-8 text-center text-white font-bold text-3xl shadow-xl p-12 select-none"
          style={{
            backgroundImage: "url('/bg-dashboard.png')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          Find your Community on{" "}
          <span className="text-white font-extrabold">echo⟩</span>
        </div>

        {/* Featured Community */}
        <section className="mb-10">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Featured Community</h2>
            <button className="text-sm text-blue-400 hover:underline">
              See all
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {featuredCommunities.map((community, idx) => (
              <DashboardCard key={idx} {...community} />
            ))}
          </div>
        </section>

        {/* Popular Right Now */}
        <section>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Popular Right Now</h2>
            <button className="text-sm text-blue-400 hover:underline">
              See all
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {popularCommunities.map((community, idx) => (
              <DashboardCard key={idx} {...community} />
            ))}
          </div>
        </section>
      </main>

      {/* Right Sidebar */}
      <aside className="w-72 relative overflow-y-auto text-white">
        <div
          className="absolute inset-0 z-0 bg-no-repeat bg-cover opacity-90"
          style={{ backgroundImage: "url('/sidebar-bg.png')" }}
        />

        <div className="relative z-10 p-4 space-y-6 backdrop-blur-md bg-black/30 rounded-l-xl h-full">
          {/* Profile */}
          <div className="flex flex-col items-center text-center">
            <img
              src="/User_profil.png"
              alt="Profile of Sophie Fortune"
              className="w-20 h-20 rounded-full border-2 border-blue-500 shadow-md"
            />
            <p className="mt-2 font-semibold">Sophie Fortune</p>
            <p className="text-sm text-gray-300">@sophiefortune</p>
          </div>

          {/* New Members */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-md font-semibold">New Members</h3>
              <button className="text-xs text-blue-400 hover:underline">
                See all
              </button>
            </div>
            <div className="space-y-4">
              {newMembers.map((user, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <img
                    src={user.avatar}
                    alt={`Avatar of ${user.name}`}
                    className="w-8 h-8 rounded-full border border-white/20"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{user.name}</p>
                    <p className="text-xs text-gray-400">{user.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-md font-semibold">Recent Activity</h3>
              <button className="text-xs text-blue-400 hover:underline">
                See all
              </button>
            </div>
            <div className="space-y-4">
              {recentActivities.map((activity, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <img
                    src={activity.avatar}
                    alt={`Avatar of ${activity.name}`}
                    className="w-8 h-8 rounded-full border border-white/20"
                  />
                  <div className="flex-1">
                    <p className="text-sm">
                      <span className="font-medium">{activity.name}</span>{" "}
                      <span className="text-gray-300">{activity.message}</span>
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {activity.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
