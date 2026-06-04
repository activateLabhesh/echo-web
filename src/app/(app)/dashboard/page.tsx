"use client";
{
  /*

export default function DashboardPage() {
  return (
    <div className="flex h-screen text-white overflow-hidden bg-gradient-to-br from-black via-slate-900 to-black">
      
      <main className="flex-1 overflow-y-auto p-10">
        
        <section className="relative mb-14">
          <div className="absolute inset-0 bg-black blur-3xl" />
          <h1 className="relative text-5xl font-extrabold mb-4 bg-gradient-to-r from-blue-600 via-cyan-400 to-purple-400 bg-clip-text text-transparent">
            IEEE Computer Society
          </h1>
          <p className="relative text-gray-300 text-2xl max-w-5xl leading-relaxed">
            IEEE Computer Society (IEEE CS) is a professional organization under
            IEEE that focuses on the field of computer science and information
            technology. It brings together students to promote learning,
            innovation, and research in areas like programming, software
            engineering, artificial intelligence, data science, cybersecurity,
            and emerging technologies.
          </p>
        </section>

    
        <section className="mb-16">
          <h2 className="text-5xl font-semibold mb-8"> Our Projects </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-14">
            {[
              {
                title: "Kalaburagi Airport Project",
                desc: "In collaboration with the Airports Authority of India, focused on modernizing and stramlining operations and services via MIS and Multimodal Transport System.",
                gradient: "from-blue-500 to-cyan-500",
              },
              {
                title: "IIT Kanpur TechKriti",
                desc: "Securing Second Place at IIT Kanpur's TechKriti incollaboration with NFRA winning Rs. 1,00,000 for developing Financial Insights Analyzer and Summarizer.",
                gradient: "from-purple-500 to-pink-500",
              },
              {
                title: "Chota Dhobi App",
                desc: "Chota Dhobi by IEEECS VIT , a laundry management app for VIT hostels , efficiently served 50,000 users reflecting the chapter's impactful innovation.",
                gradient: "from-orange-500 to-yellow-500",
              },
              {
                title: "Pravega Racing Web App",
                desc: "We helped build a fast, responsive, and visually enhanced app for Pravega Racing , ensuring seamless global connectivity for the team.",
                gradient: "from-green-500 to-emerald-500",
              },
            ].map((item, index) => (
              <div
                key={index}
                className="group relative rounded-2xl p-10 bg-slate-900/70 border border-white/10 hover:border-white/20 transition-all"
              >
                <div
                  className={`absolute inset-0 rounded-4xl bg-gradient-to-r ${item.gradient} opacity-0 group-hover:opacity-20 blur-xl transition`}
                />
                <h3 className="relative text-4xl font-semibold mb-2">
                  {item.title}
                </h3>
                <p className="relative text-xl text-gray-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-16">
          <h2 className="text-5xl font-semibold mb-8"> Our Domains </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10">
            {[
              {
                title: "Web Development",
                gradient: "from-blue-500 to-cyan-500",
              },
              {
                title: "AI & Machine Learning",
                gradient: "from-purple-500 to-pink-500",
              },
              {
                title: "Competitive Programming",
                gradient: "from-orange-500 to-yellow-500",
              },
              {
                title: "Web Development",
                gradient: "from-green-500 to-emerald-500",
              },
              {
                title: "PnM",
                gradient: "from-red-500 to-rose-500",
              },
              {
                title: "Events ",
                gradient: "from-indigo-500 to-violet-500",
              },
              {
                title: "Design ",
                gradient: "from-indigo-500 to-violet-500",
              },
            ].map((item, index) => (
              <div
                key={index}
                className="group relative rounded-2xl p-6 bg-slate-900/70 border border-white/10 hover:border-white/20 transition-all"
              >
                <div
                  className={`absolute inset-0 rounded-2xl bg-gradient-to-r ${item.gradient} opacity-0 group-hover:opacity-20 blur-xl transition`}
                />
                <h3 className="relative text-2xl font-semibold mb-2">
                  {item.title}
                </h3>
              </div>
            ))}
          </div>
        </section>


        <section className="relative text-center py-16 rounded-3xl bg-black border border-white/10">
          <h2 className="text-4xl font-bold mb-4">Visit our Website</h2>

          <a
            href="https://ieeecsvit.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-8 py-4 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-black font-semibold hover:scale-105 transition-transform"
          >
            IEEE CS VIT Website
          </a>
        </section>
      </main>
    </div>
  );
} 
{/*

("use client");

import DashboardCard from "@/components/DashboardCard";

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

        {
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

      
      <aside className="w-72 relative overflow-y-auto text-white">
        <div
          className="absolute inset-0 z-0 bg-no-repeat bg-cover opacity-90"
          style={{ backgroundImage: "url('/sidebar-bg.png')" }}
        />

        <div className="relative z-10 p-4 space-y-6 backdrop-blur-md bg-black/30 rounded-l-xl h-full">
      
          <div className="flex flex-col items-center text-center">
            <img
              src="/User_profil.png"
              alt="Profile of Sophie Fortune"
              className="w-20 h-20 rounded-full border-2 border-blue-500 shadow-md"
            />
            <p className="mt-2 font-semibold">Sophie Fortune</p>
            <p className="text-sm text-gray-300">@sophiefortune</p>
          </div>

       
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

  */
}

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/contexts/ToastContext";
export default function DashboardPage() {
  const router = useRouter();
  const { showToast } = useToast();

  useEffect(() => {
    showToast("Please login to continue", "info", 4000);

    router.replace("/");
  }, [router, showToast]);

  return null;
}
