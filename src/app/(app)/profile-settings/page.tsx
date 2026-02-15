"use client";

import { use, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { apiClient } from "@/api/axios";
import { useUser } from "@/components/UserContext";
import Loader from "@/components/Loader";

export default function ProfilePage() {
  const router = useRouter();
  const { setUser } = useUser();

  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [about, setAbout] = useState("");
  const [email, setEmail] = useState("");

  const [avatar, setAvatar] = useState("/User_profil.png");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  const [editing, setEditing] = useState({ name: false, about: false });
  const [prevName, setPrevName] = useState("");
  const [prevAbout, setPrevAbout] = useState("");

  const [changed, setChanged] = useState(false);
  const [toast, setToast] = useState<string | null>(null);


  const avatarInput = useRef<HTMLInputElement | null>(null);
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const aboutTextareaRef = useRef<HTMLTextAreaElement | null>(null);


  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 2500);
  };


 useEffect(() => {
   const fetchProfile = async () => {
     try {
       const res = await apiClient.get("/api/profile/getProfile");
       console.log("PROFILE RESPONSE:", res.data);

       const profile = res.data.user; 

       setDisplayName(profile.fullname || "");
       setUsername(profile.username || "");
       setAbout(profile.bio || "");
       setEmail(profile.email || "");
       setAvatar(profile.avatar_url || "/User_profil.png");


       setUser(profile);
     } catch (err) {
       console.error("Failed to fetch profile", err);
     } finally {
       setLoading(false);
     }
   };

   fetchProfile();
 }, [setUser]);


  /* ================= TRACK CHANGES ================= */
  useEffect(() => {
    if (!loading) setChanged(true);
  }, [displayName, about, avatarFile, loading]);


  useEffect(() => {
    if (editing.name) nameInputRef.current?.focus();
  }, [editing.name]);

  useEffect(() => {
    if (editing.about) aboutTextareaRef.current?.focus();
  }, [editing.about]);

  
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("Maximum avatar size is 5MB");
      return;
    }

    setAvatarFile(file);
    setAvatar(URL.createObjectURL(file));
  };


 const handleSave = async () => {
   if (!changed) return;

   setIsSaving(true);

   try {
     const formData = new FormData();
     formData.append("fullname", displayName);
     formData.append("bio", about);
     if (avatarFile) formData.append("avatar", avatarFile);

     const res = await apiClient.patch("/api/profile/updateProfile", formData, {
       headers: { "Content-Type": "multipart/form-data" },
     });

     const updatedUser = res.data.user;

   
     setAvatar(updatedUser.avatar_url || "/User_profil.png");


     setUser(updatedUser);

     setAvatarFile(null);
     setChanged(false);
     showToast("Profile updated");
   } catch (err) {
     console.error(err);
     showToast("Failed to update profile");
   } finally {
     setIsSaving(false);
   }
 };

 


  if (loading) {
    return (
      <div className="min-h-screen bg-black">
        <Loader fullscreen text="" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white px-6 py-16 flex justify-center">
      {toast && (
        <div className="fixed top-6 right-6 bg-green-600 px-6 py-3 rounded-xl shadow-lg z-50">
          {toast}
        </div>
      )}

      <div className="w-full max-w-6xl mx-auto grid md:grid-cols-2 gap-16">
        {/* LEFT — Identity / Hero */}
        <div className="space-y-12 h-full flex flex-col">
          <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-white/10">
            <div
              className="absolute inset-0 bg-cover bg-center scale-110"
              style={{ backgroundImage: "url('/profile-bg.png')" }}
            />
            <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-black/60 to-black/90 backdrop-blur-md" />

            <div className="relative p-12 flex flex-col items-center gap-5">
              <div
                className="group relative cursor-pointer"
                onClick={() => avatarInput.current?.click()}
              >
                <div className="absolute inset-0 rounded-full blur-lg bg-blue-500/40 opacity-0 group-hover:opacity-100 transition" />
                <Image
                  src={avatar}
                  alt="Avatar"
                  width={132}
                  height={132}
                  className="relative rounded-full border-4 border-blue-400 object-cover shadow-xl"
                />
              </div>

              <input
                ref={avatarInput}
                type="file"
                hidden
                accept="image/*"
                onChange={handleAvatarChange}
              />

              <div className="text-center">
                <h2 className="text-2xl font-semibold tracking-tight text-white">
                  {displayName}
                </h2>
                <p className="text-sm text-gray-400">@{username}</p>
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs uppercase tracking-wider text-gray-400">
                About
              </span>
              <button
                onClick={() => {
                  setPrevAbout(about);
                  setEditing((p) => ({ ...p, about: true }));
                }}
                className={`text-xs flex items-center gap-1 transition ${
                  editing.about
                    ? "text-blue-400"
                    : "text-gray-400 hover:text-blue-400"
                }`}
              >
                <Pencil size={14} /> Edit
              </button>
            </div>

            <textarea
              ref={aboutTextareaRef}
              value={about}
              readOnly={!editing.about}
              onChange={(e) => setAbout(e.target.value)}
              onBlur={() => setEditing((p) => ({ ...p, about: false }))}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setAbout(prevAbout);
                  setEditing((p) => ({ ...p, about: false }));
                }
              }}
              className="w-full flex-1 resize-none p-5 rounded-2xl bg-[#1f2937] text-white border border-white/20 backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
          </div>
        </div>

        {/* RIGHT — Settings Panel */}
        <div className="relative rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl p-10 shadow-xl space-y-12">
          <div>
            <div className="flex justify-between items-center">
              <label className="text-xs uppercase tracking-wider text-gray-400">
                Display Name
              </label>
              <button
                onClick={() => {
                  setPrevName(displayName);
                  setEditing((p) => ({ ...p, name: true }));
                }}
                className={`text-xs flex items-center gap-1 transition ${
                  editing.name
                    ? "text-blue-400"
                    : "text-gray-400 hover:text-blue-400"
                }`}
              >
                <Pencil size={14} /> Edit
              </button>
            </div>

            <input
              ref={nameInputRef}
              value={displayName}
              readOnly={!editing.name}
              onChange={(e) => setDisplayName(e.target.value)}
              onBlur={() => setEditing((p) => ({ ...p, name: false }))}
              className="w-full mt-3 p-4 rounded-xl bg-[#1f2937] text-white border border-white/20 backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
          </div>

          <div>
            <label className="text-xs uppercase tracking-wider text-gray-400">
              Username
            </label>
            <input
              value={username}
              readOnly
              className="w-full mt-3 p-4 rounded-xl bg-[#111827] text-gray-500 border border-white/10 cursor-not-allowed shadow-inner"
            />
          </div>

          <div>
            <label className="text-xs uppercase tracking-wider text-gray-400">
              Email
            </label>
            <input
              value={email}
              readOnly
              className="w-full mt-3 p-4 rounded-xl bg-[#111827] text-gray-500 border border-white/10 cursor-not-allowed shadow-inner"
            />
          </div>

          <div className="pt-8 border-t border-white/10">
            <div className="flex gap-5">
              <button
                onClick={handleSave}
                disabled={!changed || isSaving}
                className={`px-7 py-3 rounded-xl font-semibold tracking-wide transition-all ${
                  changed
                    ? "bg-gradient-to-r from-green-500 to-emerald-600 hover:scale-[1.02] hover:shadow-lg"
                    : "bg-gray-700 opacity-50 cursor-not-allowed"
                }`}
              >
                {isSaving ? "Saving…" : "Save Changes"}
              </button>

            {/*   <button
                onClick={() => router.push("/delete-account")}
                className="px-7 py-3 rounded-xl bg-red-600/70 hover:bg-red-700 hover:shadow-lg transition font-semibold"
              >
                Delete Account
              </button> */}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
