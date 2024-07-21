#![cfg_attr(not(feature = "std"), no_std)]

use frame_support::{pallet_prelude::*, BoundedVec, traits::Get};
use frame_system::pallet_prelude::*;
use sp_std::prelude::*;
use binary_merkle_tree::{merkle_root, verify_proof, Leaf};
use codec::{Encode, Decode, MaxEncodedLen};
use scale_info::TypeInfo;
use sp_runtime::traits::Hash;

pub use pallet::*;

#[frame_support::pallet]
pub mod pallet {
    use super::*;

    #[pallet::config]
    pub trait Config: frame_system::Config {
        type RuntimeEvent: From<Event<Self>> + IsType<<Self as frame_system::Config>::RuntimeEvent>;
        type Hasher: sp_runtime::traits::Hash<Output = Self::Hash>;
        type MaxLeaves: Get<u32>;
        type MaxVectorLength: Get<u32>;
        type MaxKeywords: Get<u32>;
        type MaxTitleLength: Get<u32>;
        type MaxAuthorsLength: Get<u32>;
        type MaxAbstractLength: Get<u32>;
        type MaxIpfsUrlLength: Get<u32>;
    }

    #[pallet::pallet]
    pub struct Pallet<T>(_);

    #[pallet::storage]
    #[pallet::getter(fn leaves)]
    pub type Leaves<T: Config> = StorageValue<_, BoundedVec<T::Hash, T::MaxLeaves>, ValueQuery>;

    #[pallet::storage]
    #[pallet::getter(fn papers)]
    pub type Papers<T: Config> = StorageMap<_, Blake2_128Concat, T::Hash, PaperMetadata<T>, OptionQuery>;

    #[derive(Encode, Decode, Clone, PartialEq, RuntimeDebug, TypeInfo, MaxEncodedLen)]
    #[scale_info(skip_type_params(T))]
    pub struct PaperMetadata<T: Config> {
        pub title: BoundedVec<u8, T::MaxTitleLength>,
        pub authors: BoundedVec<u8, T::MaxAuthorsLength>,
        pub abstract_text: BoundedVec<u8, T::MaxAbstractLength>,
        pub ipfs_url: BoundedVec<u8, T::MaxIpfsUrlLength>,
        pub vector: BoundedVec<u8, T::MaxVectorLength>,
        pub keywords: BoundedVec<BoundedVec<u8, T::MaxTitleLength>, T::MaxKeywords>,
    }

    #[pallet::event]
    #[pallet::generate_deposit(pub(super) fn deposit_event)]
    pub enum Event<T: Config> {
        LeafAdded(T::Hash),
        ProofVerified(bool),
        PaperAdded(T::Hash),
    }

    #[pallet::error]
    pub enum Error<T> {
        ProofVerificationFailed,
        TooManyLeaves,
        VectorTooLong,
        TooManyKeywords,
        TitleTooLong,
        AuthorsTooLong,
        AbstractTooLong,
        IpfsUrlTooLong,
    }

    #[pallet::call]
    impl<T: Config> Pallet<T> {
        #[pallet::call_index(0)]
        #[pallet::weight(T::DbWeight::get().reads_writes(1, 1))]
        pub fn add_leaf(origin: OriginFor<T>, leaf: T::Hash) -> DispatchResult {
            ensure_signed(origin)?;

            Leaves::<T>::try_mutate(|leaves| -> DispatchResult {
                leaves.try_push(leaf).map_err(|_| Error::<T>::TooManyLeaves)?;
                Ok(())
            })?;

            Self::deposit_event(Event::LeafAdded(leaf));
            Ok(())
        }

        #[pallet::call_index(1)]
        #[pallet::weight(T::DbWeight::get().reads(1))]
        pub fn verify_proof(
            origin: OriginFor<T>,
            proof: Vec<T::Hash>,
            leaf_index: u32,
            leaf: T::Hash,
        ) -> DispatchResult {
            ensure_signed(origin)?;

            let leaves = Leaves::<T>::get();
            let root = merkle_root::<T::Hasher, _>(leaves.iter().map(|h| h.as_ref()));

            let is_valid = verify_proof::<T::Hasher, _, _>(
                &root,
                proof,
                leaves.len(),
                leaf_index as usize,
                Leaf::Hash(leaf),
            );

            Self::deposit_event(Event::ProofVerified(is_valid));

            ensure!(is_valid, Error::<T>::ProofVerificationFailed);
            Ok(())
        }

        #[pallet::call_index(2)]
        #[pallet::weight(T::DbWeight::get().reads_writes(1, 1))]
        pub fn add_paper(
            origin: OriginFor<T>,
            title: Vec<u8>,
            authors: Vec<u8>,
            abstract_text: Vec<u8>,
            ipfs_url: Vec<u8>,
            vector: Vec<u8>,
            keywords: Vec<Vec<u8>>,
        ) -> DispatchResult {
            let _who = ensure_signed(origin)?;
        
            let bounded_title: BoundedVec<u8, T::MaxTitleLength> = title
                .try_into()
                .map_err(|_| Error::<T>::TitleTooLong)?;
        
            let bounded_authors: BoundedVec<u8, T::MaxAuthorsLength> = authors
                .try_into()
                .map_err(|_| Error::<T>::AuthorsTooLong)?;
        
            let bounded_abstract: BoundedVec<u8, T::MaxAbstractLength> = abstract_text
                .try_into()
                .map_err(|_| Error::<T>::AbstractTooLong)?;
        
            let bounded_ipfs_url: BoundedVec<u8, T::MaxIpfsUrlLength> = ipfs_url
                .try_into()
                .map_err(|_| Error::<T>::IpfsUrlTooLong)?;
        
            let bounded_vector: BoundedVec<u8, T::MaxVectorLength> = vector
                .try_into()
                .map_err(|_| Error::<T>::VectorTooLong)?;
        
            let bounded_keywords: BoundedVec<BoundedVec<u8, T::MaxTitleLength>, T::MaxKeywords> = keywords
                .into_iter()
                .map(|k| k.try_into().map_err(|_| Error::<T>::TitleTooLong))
                .collect::<Result<Vec<_>, _>>()?
                .try_into()
                .map_err(|_| Error::<T>::TooManyKeywords)?;
        
            let metadata = PaperMetadata {
                title: bounded_title.clone(),
                authors: bounded_authors,
                abstract_text: bounded_abstract,
                ipfs_url: bounded_ipfs_url,
                vector: bounded_vector,
                keywords: bounded_keywords,
            };
        
            let paper_hash = T::Hasher::hash_of(&bounded_title);
        
            Papers::<T>::insert(paper_hash, metadata);
            Self::deposit_event(Event::PaperAdded(paper_hash));
        
            Ok(())
        }
    }
}