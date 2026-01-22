"use client";

import { use, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { apiClient } from "@/api/axios";
import { useUser } from "@/components/UserContext";

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
      <div className="min-h-screen bg-black flex items-center justify-center text-gray-400">
        Loading profile…
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

      <div className="w-full max-w-6xl grid md:grid-cols-2 gap-14">
        {/* LEFT */}
        <div className="space-y-10">
          <div className="relative rounded-3xl overflow-hidden shadow-xl">
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: "url('/profile-bg.png')" }}
            />
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

            <div className="relative p-10 flex flex-col items-center gap-4">
              <div
                className="relative cursor-pointer"
                onClick={() => avatarInput.current?.click()}
              >
                <Image
                  src={avatar}
                  alt="Avatar"
                  width={120}
                  height={120}
                  className="rounded-full border-4 border-blue-400 object-cover"
                />
              </div>

              <input
                ref={avatarInput}
                type="file"
                hidden
                accept="image/*"
                onChange={handleAvatarChange}
              />

              <h2 className="text-xl font-semibold">{displayName}</h2>
              <p className="text-sm text-gray-400">@{username}</p>
            </div>
          </div>

          {/* About */}
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-sm text-gray-400">About</span>
              <button
                onClick={() => {
                  setPrevAbout(about);
                  setEditing((p) => ({ ...p, about: true }));
                }}
                className="text-xs flex items-center gap-1 text-gray-400 hover:text-white"
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
              className="w-full h-36 p-4 rounded-xl bg-[#1f2937] border border-white/20"
            />
          </div>
        </div>

        {/* RIGHT */}
        <div className="space-y-10">
          {/* Name */}
          <div>
            <div className="flex justify-between">
              <label className="text-sm text-gray-400">Display Name</label>
              <button
                onClick={() => {
                  setPrevName(displayName);
                  setEditing((p) => ({ ...p, name: true }));
                }}
                className="text-xs flex items-center gap-1 text-gray-400 hover:text-white"
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
              className="w-full mt-2 p-3 rounded-lg bg-[#1f2937] border border-white/20"
            />
          </div>
          <div>
            <label className="text-sm text-gray-400">Username</label>
            <input
              value={username}
              readOnly
              className="w-full mt-2 p-3 rounded-lg bg-[#1f2937] border border-white/20"
            />
          </div>

          {/* Email */}
          <div>
            <label className="text-sm text-gray-400">Email</label>
            <input
              value={email}
              readOnly
              className="w-full mt-2 p-3 rounded-lg bg-[#1f2937] border border-white/20"
            />
          </div>

          {/* Actions */}
          <div className="pt-6 border-t border-red-500/30">
            <div className="flex gap-4">
              <button
                onClick={handleSave}
                disabled={!changed || isSaving}
                className={`px-6 py-2 rounded-lg font-semibold ${
                  changed
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-gray-700 opacity-50"
                }`}
              >
                {isSaving ? "Saving…" : "Save Changes"}
              </button>

              <button
                onClick={() => router.push("/delete-account")}
                className="px-6 py-2 rounded-lg bg-red-700 hover:bg-red-800 font-semibold"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
