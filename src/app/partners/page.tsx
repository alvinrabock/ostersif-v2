// src/pages/yourPage.tsx

import MaxWidthWrapper from '@/app/components/MaxWidthWrapper';
import { fetchSinglePersonalAvdelningar } from '@/lib/apollo/fechPersonalAvdelningar/fetchSinglePersonalAvdelningarAction';
import { fetchAllForetagspaketKategorier } from '@/lib/apollo/fetchForetagspaketKategorier/fetchAllForetagspaketKategorierAction';
import { fetchAllPartnernivaer } from '@/lib/apollo/fetchPartnernivaer/fetchAllForetagnivaertAction';
import React, { Suspense } from 'react';
import ForetagsPaketArchive from './ForetagsPaketArchive';

const Page = async () => {
    const paketData = await fetchAllForetagspaketKategorier();
    const personalAvdelningData = await fetchSinglePersonalAvdelningar("marknad-och-forsaljning");
    const partnernivaerData = await fetchAllPartnernivaer();

    return (
        <div className='pt-46 pb-36 w-full bg-custom_dark_dark_red text-white'>
            <MaxWidthWrapper>
                <Suspense>
                    <ForetagsPaketArchive
                        paketData={paketData}
                        personalAvdelningData={personalAvdelningData}
                        partnernivaerData={partnernivaerData}
                    />
                </Suspense>
            </MaxWidthWrapper>
        </div>
    );
};

export default Page;
