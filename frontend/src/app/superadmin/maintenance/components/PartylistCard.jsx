"use client";

const PartylistCard = ({ 
  partylist, 
  isArchived = false,
  onViewDetails, 
  onEdit, 
  onArchive, 
  onRestore, 
  onDelete 
}) => {
  return (
    <div className="bg-white rounded-lg border shadow-sm p-4">
      <div className="grid grid-cols-12 gap-4">
   
        <div className="col-span-2">
          <div className="text-sm font-medium text-black mb-2">Logo</div>
          {partylist.logo_url ? (
            <img 
              src={`${partylist.logo_url}`} 
              alt={`${partylist.name} logo`} 
              className={`h-28 w-28 object-contain border rounded-md bg-gray-50 p-1 ${isArchived ? 'opacity-60' : ''}`}
            />
          ) : (
            <div className={`h-28 w-28 flex items-center justify-center bg-gray-100 border rounded-md ${isArchived ? 'opacity-60' : ''}`}>
              <span className="text-gray-400">No logo</span>
            </div>
          )}
        </div>

        <div className="col-span-2">
          <div className="text-sm font-medium text-black mb-2">Partylist Name</div>
          <h4 className={`text-lg font-semibold ${isArchived ? 'text-black' : 'text-black'}`}>
            {partylist.name}
          </h4>
        </div>
 
        <div className="col-span-2">
          <div className="text-sm font-medium text-black  mb-2">Slogan</div>
          <p className={`text-sm ${isArchived ? 'text-black' : 'text-black'}`}>
            {partylist.slogan || "-"}
          </p>
        </div>

        <div className="col-span-3">
          <div className="text-sm font-medium text-black mb-2">Platform/Advocacy</div>
          <div className={`text-sm max-h-28 overflow-y-auto pr-2 whitespace-pre-wrap ${isArchived ? 'text-black' : 'text-black'}`}>
            {partylist.advocacy || "-"}
          </div>
        </div>

        <div className="col-span-3">
          <div className="text-sm font-medium text-black mb-2">Actions</div>
          {isArchived ? (
            <div className="flex flex-wrap gap-2">
              <button
                className="w-20 h-8 bg-green-500 text-white rounded hover:bg-green-600 font-medium text-xs inline-flex items-center justify-center"
                onClick={() => onRestore(partylist.id)}
              >
                Restore
              </button>
              <button
                onClick={() => onDelete(partylist.id)}
                className="w-20 h-8 bg-red-600 text-white rounded hover:bg-red-700 font-medium text-xs inline-flex items-center justify-center"
              >
                Delete
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <button
                className="w-20 h-8 bg-amber-500 text-white rounded hover:bg-amber-600 font-medium text-xs inline-flex items-center justify-center"
                onClick={() => onEdit(partylist)}
              >
                Edit
              </button>
              <button
                onClick={() => onArchive(partylist.id)}
                className="w-20 h-8 bg-red-500 text-white rounded hover:bg-red-600 font-medium text-xs inline-flex items-center justify-center"
              >
                Archive
              </button>
              <button
                onClick={() => onViewDetails(partylist)}
                className="w-20 h-8 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium text-xs inline-flex items-center justify-center"
              >
                Details
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PartylistCard; 