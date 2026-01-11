"use client";

import { useState } from "react";

import { Languages } from "lucide-react";

import { Button } from "@/components/ui/button";

interface ParcelDetailsDisplayProps {
    details: any;
}

export function ParcelDetailsDisplay({ details }: ParcelDetailsDisplayProps) {
    const [showEnglish, setShowEnglish] = useState(false);

    if (!details) {
        return (
            <div className="border rounded-lg p-6 bg-muted/10 text-center text-muted-foreground">
                <p className="text-sm">Search for a parcel to view detailed information here</p>
            </div>
        );
    }

    // Handle array response
    const parcelData = Array.isArray(details) ? details[0] : details;

    // If still no valid data
    if (!parcelData || !parcelData.PrPropertyId) {
        return (
            <div className="border rounded-lg p-6 bg-yellow-50 border-yellow-200">
                <p className="text-sm font-medium text-yellow-800 mb-2">Unexpected Data Structure</p>
                <pre className="text-xs bg-white p-2 rounded overflow-auto max-h-[400px]">
                    {JSON.stringify(details, null, 2)}
                </pre>
            </div>
        );
    }

    // Helper function to render bilingual text
    const BilingualText = ({ greek, english }: { greek?: string; english?: string }) => {
        if (!greek && !english) return <span>N/A</span>;

        return (
            <div className="flex flex-col gap-0.5">
                {greek && <span className="font-medium">{greek}</span>}
                {showEnglish && english && greek !== english && (
                    <span className="text-xs text-muted-foreground italic">{english}</span>
                )}
            </div>
        );
    };

    // Helper function to render bilingual labels
    const BilingualLabel = ({ greek, english }: { greek: string; english: string }) => {
        return (
            <span className="text-muted-foreground">
                {greek}
                {showEnglish && english && ` (${english})`}:
            </span>
        );
    };

    return (
        <div className="border rounded-lg bg-muted/30 overflow-hidden">
            <div className="bg-primary/10 px-4 py-3 border-b flex items-center justify-between">
                <h3 className="font-semibold text-lg">
                    Πληροφορίες Τεμαχίου (Parcel Information)
                </h3>
                <Button
                    variant={showEnglish ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowEnglish(!showEnglish)}
                    className="gap-2"
                >
                    <Languages className="h-4 w-4" />
                    English
                </Button>
            </div>
            <div className="p-4 space-y-6 max-h-[400px] overflow-y-auto">
                {/* Basic Information */}
                <div className="space-y-3">
                    <h4 className="font-semibold text-sm text-primary border-b pb-1">
                        Βασικές Πληροφορίες{showEnglish && ' (Basic Information)'}
                    </h4>
                    <div className="grid gap-2 text-sm">
                        {(parcelData.PrPropertyTypeNameEl || parcelData.PrPropertyTypeNameEn) && (
                            <div className="grid grid-cols-[160px_1fr] gap-2">
                                <BilingualLabel greek="Τύπος Ιδιοκτησίας" english="Property Type" />
                                <BilingualText
                                    greek={parcelData.PrPropertyTypeNameEl}
                                    english={parcelData.PrPropertyTypeNameEn}
                                />
                            </div>
                        )}
                        {parcelData.PrParcelNo && (
                            <div className="grid grid-cols-[160px_1fr] gap-2">
                                <BilingualLabel greek="Αριθμός Τεμαχίου" english="Parcel No" />
                                <span className="font-medium">{parcelData.PrParcelNo}</span>
                            </div>
                        )}
                        {parcelData.PrRegistrationNo && (
                            <div className="grid grid-cols-[160px_1fr] gap-2">
                                <BilingualLabel greek="Αριθμός Εγγραφής" english="Registration No" />
                                <span className="font-medium">{parcelData.PrRegistrationNo}</span>
                            </div>
                        )}
                        {parcelData.PrRegistrationBlock !== undefined && (
                            <div className="grid grid-cols-[160px_1fr] gap-2">
                                <BilingualLabel greek="Τεμάχιο Εγγραφής" english="Reg. Block" />
                                <span className="font-medium">{parcelData.PrRegistrationBlock}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Location Information */}
                <div className="space-y-3">
                    <h4 className="font-semibold text-sm text-primary border-b pb-1">
                        Τοποθεσία{showEnglish && ' (Location)'}
                    </h4>
                    <div className="grid gap-2 text-sm">
                        {(parcelData.DistrictName || parcelData.PrDistrictNameEl || parcelData.PrDistrictNameEn) && (
                            <div className="grid grid-cols-[160px_1fr] gap-2">
                                <BilingualLabel greek="Επαρχία" english="District" />
                                <BilingualText
                                    greek={parcelData.DistrictName || parcelData.PrDistrictNameEl}
                                    english={parcelData.PrDistrictNameEn}
                                />
                            </div>
                        )}
                        {(parcelData.MunicipalityName || parcelData.PrMunicipalityNameEl || parcelData.PrMunicipalityNameEn) && (
                            <div className="grid grid-cols-[160px_1fr] gap-2">
                                <BilingualLabel greek="Δήμος" english="Municipality" />
                                <BilingualText
                                    greek={parcelData.MunicipalityName || parcelData.PrMunicipalityNameEl}
                                    english={parcelData.PrMunicipalityNameEn}
                                />
                            </div>
                        )}
                        {(parcelData.QuarterName || parcelData.PrQuarterNameEl || parcelData.PrQuarterNameEn) &&
                            (parcelData.QuarterName?.trim() || parcelData.PrQuarterNameEl?.trim() || parcelData.PrQuarterNameEn?.trim()) && (
                                <div className="grid grid-cols-[160px_1fr] gap-2">
                                    <BilingualLabel greek="Συνοικία" english="Quarter" />
                                    <BilingualText
                                        greek={parcelData.QuarterName || parcelData.PrQuarterNameEl}
                                        english={parcelData.PrQuarterNameEn}
                                    />
                                </div>
                            )}
                        {parcelData.PrLocation && (
                            <div className="grid grid-cols-[160px_1fr] gap-2">
                                <BilingualLabel greek="Περιοχή" english="Location" />
                                <span className="font-medium">{parcelData.PrLocation}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Plan Details */}
                <div className="space-y-3">
                    <h4 className="font-semibold text-sm text-primary border-b pb-1">
                        Λεπτομέρειες Σχεδίου{showEnglish && ' (Plan Details)'}
                    </h4>
                    <div className="grid gap-2 text-sm">
                        {parcelData.PrSheetValue && (
                            <div className="grid grid-cols-[160px_1fr] gap-2">
                                <BilingualLabel greek="Φύλλο" english="Sheet" />
                                <span className="font-medium">{parcelData.PrSheetValue}</span>
                            </div>
                        )}
                        {parcelData.PrPlanValue && (
                            <div className="grid grid-cols-[160px_1fr] gap-2">
                                <BilingualLabel greek="Σχέδιο" english="Plan" />
                                <span className="font-medium">{parcelData.PrPlanValue}</span>
                            </div>
                        )}
                        {parcelData.PrBlockValue && (
                            <div className="grid grid-cols-[160px_1fr] gap-2">
                                <BilingualLabel greek="Τεμάχιο" english="Block" />
                                <span className="font-medium">{parcelData.PrBlockValue}</span>
                            </div>
                        )}
                        {parcelData.PrScaleValue && (
                            <div className="grid grid-cols-[160px_1fr] gap-2">
                                <BilingualLabel greek="Κλίμακα" english="Scale" />
                                <span className="font-medium">{parcelData.PrScaleValue}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Area & Extent */}
                <div className="space-y-3">
                    <h4 className="font-semibold text-sm text-primary border-b pb-1">
                        Έκταση{showEnglish && ' (Area & Extent)'}
                    </h4>
                    <div className="grid gap-2 text-sm">
                        {parcelData.PrParcelExtent !== undefined && (
                            <div className="grid grid-cols-[160px_1fr] gap-2">
                                <BilingualLabel greek="Έκταση Τεμαχίου" english="Parcel Extent" />
                                <span className="font-medium">{parcelData.PrParcelExtent} m²</span>
                            </div>
                        )}
                        {parcelData.PrExtents !== undefined && (
                            <div className="grid grid-cols-[160px_1fr] gap-2">
                                <BilingualLabel greek="Συνολική Έκταση" english="Total Extents" />
                                <span className="font-medium">{parcelData.PrExtents} m²</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Planning Zone */}
                {parcelData.PrPlanningZone && (
                    <div className="space-y-3">
                        <h4 className="font-semibold text-sm text-primary border-b pb-1">
                            Πολεοδομική Ζώνη{showEnglish && ' (Planning Zone)'}
                        </h4>
                        <div className="grid gap-2 text-sm">
                            {parcelData.PrPlanningZone.PrName && (
                                <div className="grid grid-cols-[160px_1fr] gap-2">
                                    <BilingualLabel greek="Κωδικός Ζώνης" english="Zone Code" />
                                    <span className="font-medium">{parcelData.PrPlanningZone.PrName}</span>
                                </div>
                            )}
                            {(parcelData.PrPlanningZone.PrNameGr || parcelData.PrPlanningZone.PrNameEn) && (
                                <div className="grid grid-cols-[160px_1fr] gap-2">
                                    <BilingualLabel greek="Όνομα Ζώνης" english="Zone Name" />
                                    <BilingualText
                                        greek={parcelData.PrPlanningZone.PrNameGr}
                                        english={parcelData.PrPlanningZone.PrNameEn}
                                    />
                                </div>
                            )}
                            {parcelData.PrPlanningZone.PrDensityRateQty !== undefined && (
                                <div className="grid grid-cols-[160px_1fr] gap-2">
                                    <BilingualLabel greek="Πυκνότητα" english="Density" />
                                    <span className="font-medium">{parcelData.PrPlanningZone.PrDensityRateQty}</span>
                                </div>
                            )}
                            {parcelData.PrPlanningZone.PrCoverageRate !== undefined && (
                                <div className="grid grid-cols-[160px_1fr] gap-2">
                                    <BilingualLabel greek="Κάλυψη" english="Coverage" />
                                    <span className="font-medium">{parcelData.PrPlanningZone.PrCoverageRate}</span>
                                </div>
                            )}
                            {parcelData.PrPlanningZone.PrStoreyNoQty !== undefined && (
                                <div className="grid grid-cols-[160px_1fr] gap-2">
                                    <BilingualLabel greek="Μέγιστοι Όροφοι" english="Max Floors" />
                                    <span className="font-medium">{parcelData.PrPlanningZone.PrStoreyNoQty}</span>
                                </div>
                            )}
                            {parcelData.PrPlanningZone.PrHeightMSR !== undefined && (
                                <div className="grid grid-cols-[160px_1fr] gap-2">
                                    <BilingualLabel greek="Μέγιστο Ύψος" english="Max Height" />
                                    <span className="font-medium">{parcelData.PrPlanningZone.PrHeightMSR} m</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Property Subproperties */}
                {parcelData.PrPropertySubproperty && parcelData.PrPropertySubproperty.length > 0 && (
                    <div className="space-y-3">
                        <h4 className="font-semibold text-sm text-primary border-b pb-1">
                            Χρήσεις Γης{showEnglish && ' (Land Uses)'}
                        </h4>
                        <div className="space-y-2">
                            {parcelData.PrPropertySubproperty.map((subprop: any, idx: number) => (
                                <div key={idx} className="bg-muted/50 rounded p-3 text-sm space-y-2">
                                    <div>
                                        <div className="text-xs text-muted-foreground mb-1">
                                            Τύπος{showEnglish && ' (Type)'}:
                                        </div>
                                        <BilingualText
                                            greek={subprop.PrSubPropertyKind?.PrNameGr}
                                            english={subprop.PrSubPropertyKind?.PrNameEn}
                                        />
                                    </div>
                                    {(subprop.PrSubPropertyKindCategory?.PrNameGr || subprop.PrSubPropertyKindCategory?.PrNameEn) && (
                                        <div>
                                            <div className="text-xs text-muted-foreground mb-1">
                                                Κατηγορία{showEnglish && ' (Category)'}:
                                            </div>
                                            <BilingualText
                                                greek={subprop.PrSubPropertyKindCategory.PrNameGr}
                                                english={subprop.PrSubPropertyKindCategory.PrNameEn}
                                            />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Valuation */}
                <div className="space-y-3">
                    <h4 className="font-semibold text-sm text-primary border-b pb-1">
                        Εκτίμηση{showEnglish && ' (Valuation)'}
                    </h4>
                    <div className="grid gap-2 text-sm">
                        {parcelData.PrPriceBase1 !== undefined && parcelData.PrPriceBase1 !== null && (
                            <div className="grid grid-cols-[160px_1fr] gap-2">
                                <BilingualLabel greek="Βασική Τιμή 1" english="Base Price 1" />
                                <span className="font-medium">€{parcelData.PrPriceBase1.toLocaleString()}</span>
                            </div>
                        )}
                        {parcelData.PrPriceBase2 !== undefined && parcelData.PrPriceBase2 !== null && (
                            <div className="grid grid-cols-[160px_1fr] gap-2">
                                <BilingualLabel greek="Βασική Τιμή 2" english="Base Price 2" />
                                <span className="font-medium">€{parcelData.PrPriceBase2.toLocaleString()}</span>
                            </div>
                        )}
                        {parcelData.PrPriceBase2Date && (
                            <div className="grid grid-cols-[160px_1fr] gap-2">
                                <BilingualLabel greek="Ημερομηνία Τιμής" english="Price Date" />
                                <span className="font-medium">{new Date(parcelData.PrPriceBase2Date).toLocaleDateString()}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Additional Information */}
                <div className="space-y-3">
                    <h4 className="font-semibold text-sm text-primary border-b pb-1">
                        Πρόσθετες Πληροφορίες{showEnglish && ' (Additional Information)'}
                    </h4>
                    <div className="grid gap-2 text-sm">
                        {parcelData.PrRegistrationDate && (
                            <div className="grid grid-cols-[160px_1fr] gap-2">
                                <BilingualLabel greek="Ημ/νία Εγγραφής" english="Reg. Date" />
                                <span className="font-medium">{new Date(parcelData.PrRegistrationDate).toLocaleDateString()}</span>
                            </div>
                        )}
                        {parcelData.PrOccupationStatus !== undefined && (
                            <div className="grid grid-cols-[160px_1fr] gap-2">
                                <BilingualLabel greek="Κατοχή" english="Occupation" />
                                <span className="font-medium">
                                    {parcelData.PrOccupationStatus === 1
                                        ? (showEnglish ? 'Κατειλημμένο (Occupied)' : 'Κατειλημμένο')
                                        : (showEnglish ? 'Κενό (Vacant)' : 'Κενό')
                                    }
                                </span>
                            </div>
                        )}
                        {parcelData.PrIsPreserved !== undefined && parcelData.PrIsPreserved === 1 && (
                            <div className="grid grid-cols-[160px_1fr] gap-2">
                                <BilingualLabel greek="Κατάσταση" english="Status" />
                                <span className="font-medium text-amber-600">
                                    {showEnglish ? 'Διατηρητέο (Preserved)' : 'Διατηρητέο'}
                                </span>
                            </div>
                        )}
                        {parcelData.PrIsAncient !== undefined && parcelData.PrIsAncient === 1 && (
                            <div className="grid grid-cols-[160px_1fr] gap-2">
                                <BilingualLabel greek="Κατάσταση" english="Status" />
                                <span className="font-medium text-amber-600">
                                    {showEnglish ? 'Αρχαίος Χώρος (Ancient Site)' : 'Αρχαίος Χώρος'}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

