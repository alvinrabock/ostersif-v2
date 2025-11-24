'use client';

import ForetagsPaketItem from '@/app/components/Partners/ForetagsPaketItem';
import ContactDialog from '@/app/components/Partners/ContactDialog';
import PartnernivaDialog from '@/app/components/Partners/PartnernivaDialog';
import { Foretagspaketkategorier, Partnernivaer, Personalavdelningar } from '@/types';

interface ForetagsPaketArchiveProps {
    paketData: Foretagspaketkategorier[];
    personalAvdelningData: Personalavdelningar;
    partnernivaerData: Partnernivaer[];
}

const ForetagsPaketArchive = ({ paketData, personalAvdelningData, partnernivaerData }: ForetagsPaketArchiveProps) => {
    
    return (
        <div className="px-4 md:px-8">
            {/* Title and description */}
            <div className="mb-20 pb-10 border-b border-white/20">
                <h1 className="text-4xl font-bold uppercase mb-4">Bli partner till Östers IF</h1>
                <p className="text-gray-200 mb-6 max-w-2xl">
                    Här finns våra olika sponsorpaket. Du kan välja ett enskilt paket eller plocka ihop ett anpassat partnerskap med olika paket utifrån vad ni efterfrågar.
                </p>

                {/* Buttons aligned next to each other */}
                <div className="flex flex-wrap gap-4">
                    <ContactDialog personalAvdelningData={personalAvdelningData} />
                    <PartnernivaDialog partnernivaerData={partnernivaerData} />
                </div>
            </div>

            {/* Filter buttons - commented out */}
            {/*
            <div className="w-full rounded-md mb-10 overflow-x-auto flex gap-4 p-4 scrollbar-thin scrollbar-thumb-white scrollbar-track-transparent bg-custom_dark_red">
                <button
                    onClick={() => handleFilterChange(null)}
                    className={`min-w-[120px] px-4 py-2 text-sm font-semibold border-b-2 ${!selectedCategorySlug
                        ? 'border-white bg-white text-black rounded-md'
                        : 'border-transparent hover:border-white text-white'
                        } transition-all whitespace-nowrap`}
                >
                    Alla
                </button>

                {Array.isArray(paketData) && paketData.map(category => (
                    <button
                        key={category.id}
                        onClick={() => category.slug && handleFilterChange(category.slug)}
                        className={`min-w-[120px] px-4 py-2 text-sm font-semibold border-b-2 ${selectedCategorySlug === category.slug
                            ? 'border-white bg-white text-black rounded-md'
                            : 'border-transparent hover:border-white text-white'
                            } transition-all whitespace-nowrap`}
                    >
                        {category.title}
                    </button>
                ))}
            </div>
            */}

            {/* Packages */}
            {Array.isArray(paketData) && paketData.length > 0 ? (
                paketData.map(category => {
                    // Sort packages by publishedAt descending (newest first)
                    const sortedPackages = Array.isArray(category.koppladepaket?.docs)
                        ? [...category.koppladepaket.docs].sort((a, b) => {
                            if (typeof a === 'string' || typeof b === 'string') return 0;
                            const dateA = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
                            const dateB = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
                            return dateB - dateA;
                        })
                        : [];

                    return (
                        <div key={category.id} className="mb-16">
                            <h2 className="text-3xl font-bold text-left mb-8">{category.title}</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {sortedPackages.map(item => {
                                    if (typeof item !== 'string' && item.id) {
                                        return (
                                            <ForetagsPaketItem
                                                key={item.id}
                                                item={item}
                                            />
                                        );
                                    }
                                    return null;
                                })}
                            </div>
                        </div>
                    );
                })
            ) : (
                <div className="text-center text-gray-500">Inga resultat hittades för den valda kategorin.</div>
            )}
        </div>
    );
};

export default ForetagsPaketArchive;
