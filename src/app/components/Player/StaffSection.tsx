import { Media } from "../Media/index";
import type { Lag } from "@/types";
import Image from "next/image";

type Staff = NonNullable<Lag['staff']>[number];

export const StaffSection = ({ staff }: { staff: Staff[] }) => (
  <aside className="col-span-1">
    <h2 className="text-white text-3xl font-bold mb-6">Stab</h2>
    <div className="flex flex-col gap-6">
      {staff.map((person, index) => (
        <div key={index} className="flex text-white rounded-2xl overflow-hidden group">
          {person.image ? (
            <div className="flex-shrink-0 w-20 h-20 relative rounded-full overflow-hidden">
              <Media
                resource={person.image}
                alt={person.name}
                size="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 15vw"
                imgClassName="object-cover w-full h-full"
                loading="lazy"
              />
            </div>
          ) : (
            <div className="flex-shrink-0 w-20 h-20 relative rounded-full overflow-hidden bg-custom_red flex items-center justify-center">
              <Image
                src="/oster-vit-logotype.png"
                alt="Öster logo"
                width={40}
                height={40}
                className="object-contain"
              />
            </div>
          )}
          <div className="flex flex-col justify-center p-4 flex-grow">
            <h2 className="text-lg font-bold">{person.name}</h2>
            <p className="text-xs sm:text-sm">{person.role}</p>
          </div>
        </div>
      ))}
    </div>
  </aside>
);