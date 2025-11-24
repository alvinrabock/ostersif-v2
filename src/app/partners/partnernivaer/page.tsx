import MaxWidthWrapper from '@/app/components/MaxWidthWrapper';
import { fetchAllPartnernivaer } from '@/lib/apollo/fetchPartnernivaer/fetchAllForetagnivaertAction';
import Image from 'next/image';

interface PartnernivaItem {
    id: string;
    title: string;
    investering: string;
    kortbeskrivning?: string;
    publishedAt: string;
    Ingaripaketet?: { id: string; text: string }[];
}

const PartnernivaPage = async () => {
    const partnernivaerData: PartnernivaItem[] = await fetchAllPartnernivaer();

    return (
        <div className="w-full py-40 bg-custom_dark_dark_red text-white">
            <MaxWidthWrapper>
                <div className="mb-8 text-left">
                    <h1 className="text-3xl font-bold">Våra Partnernivåer</h1>
                    <p className="mt-2 text-lg">Utforska de olika partnerskapsnivåerna och deras förmåner.</p>
                </div>

                {partnernivaerData && partnernivaerData.length > 0 ? (
                    <div className="space-y-12">
                        {partnernivaerData.map((nivå) => (
                            <div key={nivå.id} className="bg-custom_dark_red border border-white/10 p-6 rounded-xl shadow-md">
                                <div className="mt-4">
                                    <h3 className="text-xl font-semibold mb-1">{nivå.title}</h3>
                                    <p className="text-md text-white/65 pb-2">
                                        Investering: {nivå.investering}
                                    </p>
                                    {nivå.kortbeskrivning && (
                                        <p className="text-white/80 mt-2">{nivå.kortbeskrivning}</p>
                                    )}
                                    <ul className="mt-4 space-y-4 border-t border-white/20 pt-4">
                                        {nivå.Ingaripaketet?.map((punkt) => (
                                            <li key={punkt.id} className="flex items-start gap-2">
                                                <Image
                                                    src="/oster-vit-logotype.png"
                                                    alt={nivå.title}
                                                    width={22}
                                                    height={12}
                                                />
                                                <span className="text-base leading-relaxed">{punkt.text}</span>
                                            </li>
                                        ))}
                                        {!nivå.Ingaripaketet || nivå.Ingaripaketet.length === 0 ? (
                                            <li className="text-white/50">Inga specifika förmåner listade för denna nivå.</li>
                                        ) : null}
                                    </ul>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-gray-300 text-center">Ingen partnernivådata tillgänglig för tillfället.</p>
                )}
            </MaxWidthWrapper>
        </div>
    );
};

export default PartnernivaPage;
