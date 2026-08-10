import type { Dispatch, SetStateAction } from "react";
import type { AuthSession, Lang, UserProfile } from "../../../types";
import type { CustomerCopy } from "../core/copy";
import { DialogBackdrop } from "../shared/DialogBackdrop";

type ProfileForm = Pick<UserProfile, "nickname" | "gender" | "age">;

export function ProfileDialog({
  setProfileModal, setPendingCheckout, profile, t, session, profileForm,
  setProfileForm, lang, saveProfile,
}: {
  setProfileModal: Dispatch<SetStateAction<boolean>>;
  setPendingCheckout: Dispatch<SetStateAction<boolean>>;
  profile: UserProfile;
  t: CustomerCopy;
  session: AuthSession | null;
  profileForm: ProfileForm;
  setProfileForm: Dispatch<SetStateAction<ProfileForm>>;
  lang: Lang;
  saveProfile: () => void;
}) {
  return (
<DialogBackdrop
  onClose={() => {
    setProfileModal(false);
    setPendingCheckout(false);
  }}
>
  <div className="profile-modal">
    <button
      className="modal-close"
      onClick={() => {
        setProfileModal(false);
        setPendingCheckout(false);
      }}
    >
      ×
    </button>
    <span className="sticker">MEMBER PROFILE</span>
    <h2>{profile.nickname ? t.editProfile : t.completeProfile}</h2>
    <p>{session?.email}</p>
    <label className="form-field">
      <span>{t.nickname}</span>
      <input
        value={profileForm.nickname}
        onChange={(e) =>
          setProfileForm({ ...profileForm, nickname: e.target.value })
        }
        placeholder={
          lang === "zh"
            ? "大家怎么称呼你？"
            : "What should we call you?"
        }
      />
    </label>
    <div className="form-split">
      <label className="form-field">
        <span>{t.gender}</span>
        <select
          value={profileForm.gender}
          onChange={(e) =>
            setProfileForm({
              ...profileForm,
              gender: e.target.value as UserProfile["gender"],
            })
          }
        >
          <option value="">—</option>
          <option>Female</option>
          <option>Male</option>
          <option>Non-binary</option>
          <option>Prefer not to say</option>
        </select>
      </label>
      <label className="form-field">
        <span>{t.age}</span>
        <input
          type="number"
          min="13"
          max="120"
          value={profileForm.age}
          onChange={(e) =>
            setProfileForm({ ...profileForm, age: e.target.value })
          }
          placeholder="18+"
        />
      </label>
    </div>
    <small className="profile-privacy">
      {lang === "zh"
        ? "年龄与性别用于会员分析和更合适的推荐，不会公开展示。"
        : "Age and gender help with member insights and recommendations. They are never shown publicly."}
    </small>
    <button
      className="primary full"
      disabled={
        !profileForm.nickname.trim() || Number(profileForm.age) < 13
      }
      onClick={saveProfile}
    >
      {t.save} →
    </button>
  </div>
</DialogBackdrop>
  );
}
