'use client'
import Modal from "@/components/ui/modal";

const SetupPage = ()=>  {
  return (
    <div className="p-4">
      <Modal title="Test Tittle" description="Test Description" isOpen onClose={()=>{}}>
        Children
      </Modal>
    </div>
  );
}

export default SetupPage