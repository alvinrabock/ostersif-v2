"use client";

import { Logo } from '../Logo/index';
import MaxWidthWrapper from '../MaxWidthWrapper';
import React, { useState, useEffect } from 'react';
import Script from 'next/script';
import Link from 'next/link';
import { Header, Partner } from '@/types';
import MobileNav from './MobileNav';


export interface HeaderClientProps {
    headerData: Header;
    huvudpartners?: Partner[];
}

export const HeaderClient: React.FC<HeaderClientProps> = ({ headerData, huvudpartners }) => {
    const [isScrolled, setIsScrolled] = useState(true);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY === 0);
        };

        window.addEventListener('scroll', handleScroll);

        return () => {
            window.removeEventListener('scroll', handleScroll);
        };
    }, []);

    return (
        <>
            {/* Partner Header */}
            {huvudpartners && huvudpartners.length > 0 && (
                <div className="bg-custom_dark_red sticky top-0 z-40">
                    <MaxWidthWrapper>
                        <ul className="flex justify-between items-center gap-6 py-2 overflow-x-auto">
                            {huvudpartners.map((partner) => (
                                <li key={partner.id} className="flex justify-center items-center flex-shrink-0">
                                    <div className="relative h-6 w-12 sm:w-14 sm:h-7">
                                        {partner.webbplats ? (
                                            <Link
                                                href={partner.webbplats}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="block w-full h-full relative"
                                            >
                                                <img
                                                    src={typeof partner.logotyp === 'object' && partner.logotyp ? partner.logotyp.url : ''}
                                                    alt={partner.namn || partner.title}
                                                    className="w-full h-full object-contain"
                                                />
                                            </Link>
                                        ) : (
                                            <img
                                                src={typeof partner.logotyp === 'object' && partner.logotyp ? partner.logotyp.url : ''}
                                                alt={partner.namn || partner.title}
                                                className="w-full h-full object-contain"
                                            />
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </MaxWidthWrapper>
                </div>
            )}

            {/* Main Header */}
            <header
                className={`sticky top-0 z-50 w-full transition-colors duration-300 ${isScrolled ? 'bg-transparent' : 'bg-custom_dark_red opacity-100'}`}
            >
                <Script
                    async
                    id="league-top-bar-script"
                    src="https://topbar.svenskelitfotboll.se/top-bar-script.min.js"
                    data-allsvenskan="1"
                />
                <MaxWidthWrapper>
                    <div className="grid grid-cols-3 relative mb-[-107px]">
                        <div className="flex items-center justify-center col-start-2">
                            <Link href="/">
                                <Logo className="w-16 lg:w-22 h-auto" />
                            </Link>
                        </div>
                        <div className="flex items-center justify-end col-start-3">
                            <MobileNav
                                headerData={headerData}
                            />
                        </div>
                    </div>
                </MaxWidthWrapper>
            </header>
        </>
    );
};
